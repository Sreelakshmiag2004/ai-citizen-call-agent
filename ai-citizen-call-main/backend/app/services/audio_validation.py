"""Shared audio-upload validation for every endpoint that accepts a
client-uploaded audio file (`/transcribe`, `/process-complaint`,
`/process-and-create-ticket`) -- see MASTER_TODO.md's "File upload
validation is extension-only, with no size limit" item. Previously each
of those three route modules defined its own copy of
`_validate_audio_file()`/`ALLOWED_EXTENSIONS`; this module is the single
source of truth so a future format/limit change only happens in one place.

`/twilio/recording` is NOT one of these callers on purpose: it doesn't
receive a client multipart upload at all -- it downloads audio itself,
server-side, from Twilio's API using a recording URL that only arrives
after the webhook's own signature has been verified (see
`_verify_twilio_request` in app/routes/twilio.py). There's no client
filename/extension/Content-Type to validate there; the trust boundary is
already different.

Validates, in order, for every caller:
  1. A filename with one of the allowed extensions is present.
  2. The upload doesn't exceed MAX_AUDIO_UPLOAD_BYTES -- checked
     incrementally while streaming (see the chunked read loop below), so
     an oversized upload is rejected with 413 as soon as the running
     total crosses the limit, WITHOUT ever buffering the full file into
     memory first.
  3. The file isn't empty.
  4. The file's actual leading bytes match a real signature for the
     claimed extension (magic-byte / file-signature sniffing) -- this is
     what's actually trusted, never the client-supplied Content-Type
     header, which this module doesn't even look at.
"""

import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".webm", ".mp4"}

# Citizen complaint recordings are short voice clips (browser mic capture
# or a phone call), not long-form media -- 25 MB comfortably covers many
# minutes of any of the allowed formats while still bounding worst-case
# memory/disk/Whisper-processing cost per request. Overridable via env var
# for deployments with different needs.
_DEFAULT_MAX_AUDIO_UPLOAD_MB = 25
MAX_AUDIO_UPLOAD_BYTES = int(
    float(os.getenv("MAX_AUDIO_UPLOAD_MB", str(_DEFAULT_MAX_AUDIO_UPLOAD_MB))) * 1024 * 1024
)

_READ_CHUNK_BYTES = 1024 * 1024  # 1 MB per read while streaming/size-checking
_HEADER_SNIFF_BYTES = 64  # comfortably covers every signature checked below

# Signatures for definitely-not-audio file types -- catches an obviously
# mismatched upload (e.g. some_image.png renamed to complaint.wav)
# regardless of which allowed audio extension it was renamed to.
_NON_AUDIO_SIGNATURES = {
    b"\x89PNG\r\n\x1a\n": "a PNG image",
    b"\xff\xd8\xff": "a JPEG image",
    b"GIF87a": "a GIF image",
    b"GIF89a": "a GIF image",
    b"%PDF-": "a PDF document",
    b"PK\x03\x04": "a ZIP archive",
    b"\x7fELF": "an ELF executable",
    b"MZ": "a Windows executable",
    b"\x1f\x8b": "a gzip archive",
}


def _looks_like_wav(header: bytes) -> bool:
    return len(header) >= 12 and header[0:4] == b"RIFF" and header[8:12] == b"WAVE"


def _looks_like_mp4_family(header: bytes) -> bool:
    # ISO-BMFF container -- .m4a and .mp4 are both this family, sharing a
    # 4-byte box size followed by an "ftyp" box type at offset 4. The
    # specific brand after that (M4A , mp42, isom, ...) varies enough
    # across encoders that checking for it would risk false rejections;
    # the ftyp box itself is the reliable signal.
    return len(header) >= 8 and header[4:8] == b"ftyp"


def _looks_like_webm(header: bytes) -> bool:
    # EBML magic number (shared with Matroska/.mkv, which is fine -- .webm
    # is itself a constrained profile of the same container format).
    return len(header) >= 4 and header[0:4] == b"\x1a\x45\xdf\xa3"


def _looks_like_mp3(header: bytes) -> bool:
    # MP3 has no single universal magic number: an ID3v2 tag is common but
    # optional, and a "bare" stream just starts on an MPEG frame sync (11
    # set bits). Both are checked; this is deliberately a looser bar than
    # the other formats to avoid false-rejecting legitimate encoder output
    # that lacks an ID3 tag -- _NON_AUDIO_SIGNATURES above is what actually
    # catches "obvious" mismatches for this extension.
    if len(header) >= 3 and header[0:3] == b"ID3":
        return True
    return len(header) >= 2 and header[0] == 0xFF and (header[1] & 0xE0) == 0xE0


def _matching_non_audio_signature(header: bytes) -> Optional[str]:
    for signature, label in _NON_AUDIO_SIGNATURES.items():
        if header.startswith(signature):
            return label
    return None


def _validate_extension(filename: Optional[str]) -> str:
    if not filename:
        raise HTTPException(status_code=400, detail="No filename provided.")
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed formats: {allowed}",
        )
    return extension


def _validate_signature(extension: str, header: bytes) -> None:
    mismatch = _matching_non_audio_signature(header)
    if mismatch:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file does not match a {extension} audio file (detected {mismatch}).",
        )

    if extension == ".wav":
        ok = _looks_like_wav(header)
    elif extension in (".mp4", ".m4a"):
        ok = _looks_like_mp4_family(header)
    elif extension == ".webm":
        ok = _looks_like_webm(header)
    elif extension == ".mp3":
        ok = _looks_like_mp3(header)
    else:  # pragma: no cover -- _validate_extension() already restricts this
        ok = False

    if not ok:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file content does not look like a valid {extension} audio file.",
        )


async def validate_and_read_audio_file(
    file: UploadFile, max_bytes: Optional[int] = None
) -> bytes:
    """Runs every check described in this module's docstring and returns
    the fully-validated content, ready for the caller to write to disk --
    exactly the bytes every existing caller already needed from
    `await file.read()`, so this is a drop-in replacement for that call
    plus the validation that used to happen (partially) around it.

    `max_bytes` defaults to the module-level MAX_AUDIO_UPLOAD_BYTES,
    looked up at call time (not bound as a default-argument value) so
    that overriding it -- via the MAX_AUDIO_UPLOAD_MB env var before
    startup, or by monkeypatching this module's attribute in a test --
    actually takes effect."""
    if max_bytes is None:
        max_bytes = MAX_AUDIO_UPLOAD_BYTES

    extension = _validate_extension(file.filename)

    header = b""
    total = 0
    chunks = []
    while True:
        chunk = await file.read(_READ_CHUNK_BYTES)
        if not chunk:
            break
        if not header:
            header = chunk[:_HEADER_SNIFF_BYTES]
        total += len(chunk)
        if total > max_bytes:
            max_mb = max_bytes / (1024 * 1024)
            logger.warning(
                "Rejected oversized upload '%s' (>%d bytes read, limit %d bytes / %.0f MB).",
                file.filename,
                total,
                max_bytes,
                max_mb,
            )
            raise HTTPException(
                status_code=413,
                detail=f"Uploaded file exceeds the maximum allowed size of {max_mb:.0f} MB.",
            )
        chunks.append(chunk)

    if total == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    _validate_signature(extension, header)

    return b"".join(chunks)
