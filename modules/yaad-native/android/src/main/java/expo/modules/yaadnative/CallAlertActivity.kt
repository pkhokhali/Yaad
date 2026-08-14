package expo.modules.yaadnative

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.util.Locale

class CallAlertActivity : AppCompatActivity() {
  private var tts: TextToSpeech? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }
    window.addFlags(
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON,
    )

    val reminderId = intent.getStringExtra(EXTRA_REMINDER_ID) ?: ""
    val title = intent.getStringExtra(EXTRA_TITLE) ?: "Call reminder"
    val body = intent.getStringExtra(EXTRA_BODY) ?: ""
    val spoken = intent.getStringExtra(EXTRA_SPOKEN) ?: title

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#F7F8FA"))
      setPadding(48, 96, 48, 96)
    }

    val titleView = TextView(this).apply {
      text = title
      textSize = 26f
      setTextColor(Color.parseColor("#1A1D21"))
      gravity = Gravity.CENTER
    }
    val bodyView = TextView(this).apply {
      text = body
      textSize = 16f
      setTextColor(Color.parseColor("#6B7280"))
      gravity = Gravity.CENTER
      setPadding(0, 16, 0, 32)
    }

    fun actionButton(label: String, bg: Int, onClick: () -> Unit): Button {
      return Button(this).apply {
        text = label
        isAllCaps = false
        setBackgroundColor(bg)
        setTextColor(Color.WHITE)
        setOnClickListener {
          onClick()
          finish()
        }
        val lp = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          LinearLayout.LayoutParams.WRAP_CONTENT,
        )
        lp.topMargin = 16
        layoutParams = lp
      }
    }

    val callBtn = actionButton("Call now", Color.parseColor("#2563EB")) {
      openDeepLink("yaad://alert?reminderId=$reminderId&action=call")
    }
    val doneBtn = actionButton("Done", Color.parseColor("#C45C26")) {
      openDeepLink("yaad://alert?reminderId=$reminderId&action=done")
    }
    val snoozeBtn = actionButton("Snooze 30m", Color.parseColor("#64748B")) {
      openDeepLink("yaad://alert?reminderId=$reminderId&action=snooze")
    }

    root.addView(titleView)
    root.addView(bodyView)
    root.addView(callBtn)
    root.addView(doneBtn)
    root.addView(snoozeBtn)
    setContentView(root)

    speak(spoken)
  }

  private fun speak(text: String) {
    tts = TextToSpeech(this) { status ->
      if (status == TextToSpeech.SUCCESS) {
        tts?.language = Locale.getDefault()
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "yaad-call-alert")
      }
    }
  }

  private fun openDeepLink(url: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    startActivity(intent)
  }

  override fun onDestroy() {
    tts?.stop()
    tts?.shutdown()
    tts = null
    super.onDestroy()
  }

  companion object {
    private const val EXTRA_REMINDER_ID = "reminderId"
    private const val EXTRA_TITLE = "title"
    private const val EXTRA_BODY = "body"
    private const val EXTRA_SPOKEN = "spoken"

    fun launch(
      context: Context,
      reminderId: String,
      title: String,
      body: String,
      spoken: String,
    ) {
      val intent = Intent(context, CallAlertActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        putExtra(EXTRA_REMINDER_ID, reminderId)
        putExtra(EXTRA_TITLE, title)
        putExtra(EXTRA_BODY, body)
        putExtra(EXTRA_SPOKEN, spoken)
      }
      context.startActivity(intent)
    }
  }
}
