import os
from openai import OpenAI
import doc_extractor as de

# Load your API key from an environment variable

client = OpenAI(
  organization='org-l3Zg6erY9OaGazrnHq122oLu',
  project='proj_fGvFTvQ1VchG4083AYQNogNG',
)
client.api_key = os.environ["OPENAI_API_KEY"]
messages=[
    {"role": "system", "content": "Du bist ein Lektor, der ein Transkript in flüssigen Text umformulieren soll."},
    {"role": "system", "content": "Korrigiere dabei Fehler und versuche die Lücken zu füllen, die nicht richtig übersetzt worden sind."},
    {"role": "system", "content": "Schreibe hierbei die direkte Rede und Aussagen in Ich-Perspektive in neutrallen Aussagen um."},
    {"role": "system", "content": "Fasse den Inhalt hierbei nicht zusammen!"}
]
response_text = ""
chunks = de.main("backend.docx")
for chunk in chunks:
    # create copy of messages

    messages_copy = messages.copy()
    messages_copy.append({"role": "user", "content": chunk})
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages_copy)
    # append to response_text
    response_text += response.choices[0].message.content + "\n"

# output to file instead   
with open("output.asciidoc", "w") as f:
    f.write(response_text)