import av
for path in ["_debug_tamil_colloquial.mp3", "_debug_tamil_formal.mp3"]:
    c = av.open(path)
    s = c.streams.audio[0]
    dur = float(c.duration) / 1_000_000 if c.duration else None
    print(f"{path}: codec={s.codec_context.name} sr={s.codec_context.sample_rate} channels={s.codec_context.channels} duration={dur:.2f}s")
