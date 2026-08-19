package expo.modules.yaadnative

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class YaadQuickWidgetProvider : AppWidgetProvider() {
  companion object {
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, YaadQuickWidgetProvider::class.java)
      val ids = manager.getAppWidgetIds(component)
      if (ids.isEmpty()) return
      val update = Intent(context, YaadQuickWidgetProvider::class.java).apply {
        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
      }
      context.sendBroadcast(update)
    }
  }

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    val prefs = context.getSharedPreferences(YaadWidgetProvider.PREFS, Context.MODE_PRIVATE)
    val overdue = prefs.getInt("overdueCount", 0)
    val hint = if (overdue > 0) {
      "$overdue overdue · tap to speak"
    } else {
      "Tap to capture a reminder"
    }

    val voice = Intent(Intent.ACTION_VIEW, Uri.parse("yaad://capture?flow=guided&voice=1")).apply {
      setPackage(context.packageName)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pending = PendingIntent.getActivity(
      context,
      1,
      voice,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    for (widgetId in appWidgetIds) {
      val views = RemoteViews(context.packageName, R.layout.yaad_quick_widget)
      views.setTextViewText(R.id.quick_widget_hint, hint)
      views.setOnClickPendingIntent(R.id.yaad_quick_widget_root, pending)
      appWidgetManager.updateAppWidget(widgetId, views)
    }
  }
}
