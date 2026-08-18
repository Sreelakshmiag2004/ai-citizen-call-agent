"""One-off debug helper: synthesize a real Tamil audio clip for the exact
test sentence the user gave, since no audio file was attached. Uses Google
TTS (network call) purely to produce genuine Tamil speech audio to feed
into Whisper for the debugging test. Not part of the app."""
from gtts import gTTS

text = "ஹலோ, ஐயா, ஒரு நாளாக தண்ணி இல்லையா அண்ணா நகர்ல?"
tts = gTTS(text=text, lang="ta")
tts.save("_debug_tamil_test.mp3")
print("saved _debug_tamil_test.mp3")
