"""Generate two more test clips via gTTS:
1. The 'expected natural Tamil' sentence from the colloquial/Tanglish test
   (note: gTTS synthesizes clean TTS pronunciation, not a genuine informal
   human speaker -- this is disclosed as a limitation in the report).
2. A clean/formal control sentence with no colloquial vocabulary, to check
   whether Whisper's difficulty is Tamil-general or colloquial-specific.
"""
from gtts import gTTS

colloquial = "ஐயா, ஒரு மூணு நாள் தண்ணி இல்லையா விழுப்புரத்துல?"
gTTS(text=colloquial, lang="ta").save("_debug_tamil_colloquial.mp3")
print("saved _debug_tamil_colloquial.mp3")

formal = "என் பெயர் ராமு. நான் சென்னையில் வசிக்கிறேன். இன்று வானிலை மிகவும் வெப்பமாக உள்ளது."
gTTS(text=formal, lang="ta").save("_debug_tamil_formal.mp3")
print("saved _debug_tamil_formal.mp3")
