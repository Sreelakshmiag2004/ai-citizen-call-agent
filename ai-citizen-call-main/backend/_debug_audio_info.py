import av

path = "_debug_tamil_test.mp3"
container = av.open(path)
stream = container.streams.audio[0]
print("Codec:", stream.codec_context.name)
print("Sample rate:", stream.codec_context.sample_rate)
print("Channels:", stream.codec_context.channels)
print("Duration (s):", float(container.duration) / 1_000_000 if container.duration else None)
print("Format:", stream.codec_context.format)
