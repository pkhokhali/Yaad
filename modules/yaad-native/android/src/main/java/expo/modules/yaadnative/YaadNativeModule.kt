package expo.modules.yaadnative

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class YaadNativeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("YaadNative")

    AsyncFunction("synthesizeAlertSound") { text: String, localeTag: String, channelKey: String ->
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("No application context")

      val safeKey = channelKey.replace(Regex("[^a-zA-Z0-9_-]"), "").take(48)
      val channelId = "yaad-tts-$safeKey"
      val wav = File(context.cacheDir, "tts/$safeKey.wav")

      val ok = TtsSynthesizer.synthesizeToFile(context, text, localeTag, wav)
      if (!ok) {
        throw IllegalStateException("Failed to synthesize alert audio")
      }

      val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.yaadfileprovider",
        wav,
      )

      ensureChannelWithSound(context, channelId, uri)

      mapOf(
        "channelId" to channelId,
        "soundUri" to uri.toString(),
      )
    }

    AsyncFunction("showCallAlert") { reminderId: String, title: String, body: String, spoken: String ->
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("No application context")
      CallAlertActivity.launch(context, reminderId, title, body, spoken)
    }

    AsyncFunction("openBatterySettings") {
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("No application context")
      val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }

    AsyncFunction("openOfflineSpeechSettings") {
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("No application context")
      openOfflineSpeechSettings(context)
    }

    AsyncFunction("updateHomeWidget") { payload: Map<String, Any?> ->
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("No application context")
      val prefs = context.getSharedPreferences(YaadWidgetProvider.PREFS, Context.MODE_PRIVATE)
      prefs.edit()
        .putString("brand", payload["brand"] as? String ?: "Yaad")
        .putString("nextTitle", payload["nextTitle"] as? String ?: "All clear")
        .putString("nextTime", payload["nextTime"] as? String ?: "Nothing scheduled")
        .putString("summaryLine", payload["summaryLine"] as? String ?: "Tap to open Yaad")
        .putInt("overdueCount", (payload["overdueCount"] as? Number)?.toInt() ?: 0)
        .putInt("todayCount", (payload["todayCount"] as? Number)?.toInt() ?: 0)
        .putInt("streak", (payload["streak"] as? Number)?.toInt() ?: 0)
        .apply()
      YaadWidgetProvider.updateAll(context)
      YaadQuickWidgetProvider.updateAll(context)
    }
  }

  private fun openOfflineSpeechSettings(context: Context) {
    val candidates = listOf(
      Intent("com.google.android.googlequicksearchbox.action.VOICE_INPUT_SETTINGS"),
      Intent(Settings.ACTION_VOICE_INPUT_SETTINGS),
      Intent(Settings.ACTION_INPUT_METHOD_SETTINGS),
      Intent(Settings.ACTION_SETTINGS),
    )
    for (intent in candidates) {
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      if (intent.resolveActivity(context.packageManager) != null) {
        context.startActivity(intent)
        return
      }
    }
    throw IllegalStateException("Could not open speech settings on this device")
  }

  private fun ensureChannelWithSound(context: Context, channelId: String, soundUri: Uri) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val attrs = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
      .build()

    val channel = NotificationChannel(
      channelId,
      "Yaad voice alert",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Spoken reminder alerts generated on-device"
      setSound(soundUri, attrs)
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 400, 200, 400)
      lockscreenVisibility = NotificationManager.IMPORTANCE_HIGH
    }

    nm.createNotificationChannel(channel)
  }
}
