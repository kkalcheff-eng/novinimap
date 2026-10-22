export class SpeechRecognizer {
  constructor(onResult) {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognitionClass) {
      throw new Error("Speech Recognition not supported in this browser")
    }

    this.recognition = new SpeechRecognitionClass()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = "en-US"

    this.recognition.onresult = (event) => {
      let transcript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }

      onResult(transcript.trim())
    }

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event)
    }
  }

  start() {
    this.recognition.start()
  }

  stop() {
    this.recognition.stop()
  }
}