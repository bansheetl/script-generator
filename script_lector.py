import os
from openai import OpenAI
import doc_extractor as de
import sys
import tqdm

# Load your API key from an environment variable

if len(sys.argv) != 2:
    print("Usage: python script_lector.py <path_to_file>")
    sys.exit(1)

file = sys.argv[1]

client = OpenAI(
  organization='org-l3Zg6erY9OaGazrnHq122oLu',
  project='proj_fGvFTvQ1VchG4083AYQNogNG',
)
client.api_key = os.environ["OPENAI_API_KEY"]
messages=[
    {"role": "system", 
     "content": 
         '''Du bist ein Lektor für deutsche Software-Architektur Sachbücher. Du sollst einen Ausschnitt eines Transkripts  von einer Vorlesung überarbeiten. Das Transkript ist aus einer Aufnahme entstanden und wurde in Text überführt. Es enthält also Übersetzungsfehler. Das Thema der Vorlesung ist die Architektur eines Backends von einem Informationssystem. Befolge dabei unbedingt folgende Regeln. Gib anschließend nur den überarbeiteten Text aus.
         
            Regeln:
            - Schreibe die direkte Rede und Aussagen in Ich-Perspektive in neutrale Aussagen um. Beispiel: "Ich gebe euch ein Beispiel, wo dies schief gegangen ist." -> "Im folgenden wird ein Beispiel ausgeführt, bei dem dieses fehlgeschlagen ist."
            - Ersetze umgangssprachliche Redewendungen durch sachliche Erläuterungen. Beispiel: "Wir gehen jetzt in Richtung Technik." -> "Im folgenden wird näher auf die Technik eingegangen".
            - Behebe offensichtliche Übersetzungsfehler. Beispiel: "Wir verlassen den Methodischen Bereich, wie wir zum Architektur kommen" -> "Die Methodik wie man eine Architektur  konzipiert, ist in vorherigen Kapiteln erörtert worden."
            - Behebe inhaltliche Fehler. Beispiel: "Trader of Entscheidungen" -> "Trade-of Entscheidungen", oder: "Trade auf" -> "Trade-of"
            - Entferne Begrüßungen wie z.B. "Herzlich Willkommen zu unserer Vorlesung"
            - Fülle Lücken im Text, die nicht richtig von der Aufnahme in das Transkript überführt worden
            - Ersetze Videoeinheit durch Kapitel
            - Formuliere den Text um, so daß er flüssig zu lesen ist
            - Fasse den Inhalt hierbei niemals zusammen!'''}
]
response_text = ""
chunks = de.main(file, 1500)
print(f"Processing {len(chunks)} chunks")
progress_bar = tqdm.tqdm(total=len(chunks), unit="chunk")
for chunk in chunks:
    # create copy of messages
    current_message = messages.copy()
    current_message.append({"role": "user", "content": chunk})
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=current_message)
    # append to response_text
    response_text += response.choices[0].message.content + "\n"
    progress_bar.update(1)

progress_bar.close()

# output to file instead   
file_name, file_extension = os.path.splitext(file)
print(f"Writing lectored output to file {file_name + '_lectored.txt'}")
with open(file_name + "_lectored.txt", "w") as f:
    f.write(response_text)