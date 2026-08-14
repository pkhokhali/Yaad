package expo.modules.yaadnative

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.io.File
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

object TtsSynthesizer {
  fun synthesizeToFile(
    context: Context,
    text: String,
    localeTag: String,
    outFile: File,
  ): Boolean {
    outFile.parentFile?.mkdirs()
    if (outFile.exists()) {
      outFile.delete()
    }

    val errorRef = AtomicReference<Exception?>(null)
    val latch = CountDownLatch(1)
    var tts: TextToSpeech? = null

    tts = TextToSpeech(context.applicationContext) { status ->
      if (status != TextToSpeech.SUCCESS) {
        errorRef.set(IllegalStateException("TTS init failed: $status"))
        latch.countDown()
        return@TextToSpeech
      }

      try {
        val locale = Locale.forLanguageTag(localeTag.replace('_', '-'))
        tts?.language = locale

        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
          override fun onStart(utteranceId: String?) = Unit

          override fun onDone(utteranceId: String?) {
            latch.countDown()
          }

          @Deprecated("Deprecated in Java")
          override fun onError(utteranceId: String?) {
            errorRef.set(IllegalStateException("TTS synthesis error"))
            latch.countDown()
          }

          override fun onError(utteranceId: String?, errorCode: Int) {
            errorRef.set(IllegalStateException("TTS synthesis error: $errorCode"))
            latch.countDown()
          }
        })

        val params = Bundle()
        params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "yaad-tts")

        @Suppress("DEPRECATION")
        val code = tts?.synthesizeToFile(text, params, outFile, "yaad-tts") ?: TextToSpeech.ERROR
        if (code == TextToSpeech.ERROR) {
          errorRef.set(IllegalStateException("synthesizeToFile returned ERROR"))
          latch.countDown()
        }
      } catch (e: Exception) {
        errorRef.set(e)
        latch.countDown()
      }
    }

    val finished = latch.await(25, TimeUnit.SECONDS)
    tts?.shutdown()

    if (!finished) {
      throw IllegalStateException("TTS synthesis timed out")
    }
    errorRef.get()?.let { throw it }

    return outFile.exists() && outFile.length() > 0L
  }
}
