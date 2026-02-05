from google import genai

models: dict = {
    "gemma3_1B": "models/gemma-3-1b-it",
    "gemma3_2B": "models/gemma-3-2b-it",
    "gemma3_4B": "models/gemma-3-4b-it",
    "gemma3_12B": "models/gemma-3-12b-it",
    "gemma3_27B": "models/gemma-3-27b-it",
    "gemini_2.5_flash": "models/gemini-2.5-flash",


}


client = genai.Client()
chat = client.chats.create(model=models["gemma3_1B"])

print("Enter 'exit' to quit the program.")

while True:
    msg = input("You: ").strip()
    if not msg:
        continue
    if msg.lower() in {"exit", "quit"}:
        break

    resp = chat.send_message(msg)
    print("AI:", resp.text, "\n")
