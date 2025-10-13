import config as cfg
import embeddings
import lectoring.doc_extractor as de
import tqdm
from openai import AzureOpenAI
    
def convert_to_json(script_id, content):
    print(f"Converting lectored output to JSON for script {script_id}")
    paragraphs = content.split('\n\n')
    paragraphs = [p for p in paragraphs if p.strip()]  # Remove empty paragraphs
    result = {
        "id": script_id,
        "content": [
            {
                "id": idx + 1,
                "text": para,
                "embeddings": embeddings.generate_embeddings(para)
            } for idx, para in enumerate(tqdm.tqdm(paragraphs))
        ]
    }
    return result

def lector(repository):
    if repository.read_json_script():
        print("Script already lectored")
        return
    
    lectored_output = repository.read_lectored_output()
    if not lectored_output:
        lectored_output = lector_raw(repository)
        repository.save_lectored_output(lectored_output)
        
    json = convert_to_json(repository.get_script_id(), lectored_output)
    repository.save_json_script(json)

def lector_raw(repository):
    file = repository.get_transcript_file()
    print(f"Lectoring transcript from {file}")
    
    client = AzureOpenAI(
        api_key=cfg.azure_openai_api_key,
        api_version=cfg.azure_openai_version,
        azure_endpoint=cfg.azure_openai_endpoint,
    )
    
    messages=[
        {"role": "system", 
        "content": 
            '''Du bist ein Lektor für deutsche Software-Architektur Sachbücher und hast umfangreiche Erfahrung zu Software Architektur. 
            Du sollst einen Ausschnitt eines Transkripts  von einer Vorlesung über Software Architektur überarbeiten. 
            Das Transkript ist aus einer Aufnahme entstanden und wurde in Text überführt. Es enthält viele Übersetzungsfehler. 
            Befolge dabei unbedingt folgende Regeln. Gib anschließend nur den überarbeiteten Text aus.

            Regeln:
                - Schreibe die direkte Rede und Aussagen in Ich-Perspektive in neutrale Aussagen um. 
                  Beispiel: "Ich gebe euch ein Beispiel, wo dies schief gegangen ist." -> "Im folgenden wird ein Beispiel ausgeführt, bei dem dieses fehlgeschlagen ist."
                - Ersetze umgangssprachliche Redewendungen durch sachliche Erläuterungen. 
                  Beispiel: "Wir gehen jetzt in Richtung Technik." -> "Im folgenden wird näher auf die Technik eingegangen".
                - Behebe offensichtliche Übersetzungsfehler. 
                  Beispiel: "Wir verlassen den Methodischen Bereich, wie wir zum Architektur kommen" -> "Die Methodik wie man eine Architektur  konzipiert, ist in vorherigen Kapiteln erörtert worden."
                - Behebe inhaltliche Fehler. 
                  Beispiel: "Trader of Entscheidungen" -> "Trade-off-Entscheidungen", oder: "Trade auf" -> "Trade-off"
                - Entferne Begrüßungen wie z.B. "Herzlich Willkommen zu unserer Vorlesung"
                - Fülle Lücken im Text, die nicht richtig von der Aufnahme in das Transkript überführt worden
                - Ersetze jedes Mal das Wort Videoeinheit durch Kapitel
                - Formuliere den Text um, so daß er flüssig zu lesen ist
                - Fasse den Inhalt hierbei niemals zusammen!'''}
    ]
    response_text = ""
    chunks = de.extract_chunks_from_docx(file, 1500)
    print(f"Lectoring {len(chunks)} chunks")
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
    return response_text
    