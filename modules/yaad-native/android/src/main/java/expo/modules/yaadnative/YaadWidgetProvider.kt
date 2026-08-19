package expo.modules.yaadnative

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews

class YaadWidgetProvider : AppWidgetProvider() {
  companion object {
    const val PREFS = "yaad_widget"

    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, YaadWidgetProvider::class.java)
      val ids = manager.getAppWidgetIds(component)
      if (ids.isEmpty()) return
      val update = Intent(context, YaadWidgetProvider::class.java).apply {
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
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val brand = prefs.getString("brand", "Yaad") ?: "Yaad"
    val title = prefs.getString("nextTitle", "All clear") ?: "All clear"
    val time = prefs.getString("nextTime", "Nothing scheduled") ?: "Nothing scheduled"
    val summary = prefs.getString("summaryLine", "Tap to open Yaad") ?: "Tap to open Yaad"
    val overdue = prefs.getInt("overdueCount", 0)
    val today = prefs.getInt("todayCount", 0)
    val streak = prefs.getInt("streak", 0)

    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pending = PendingIntent.getActivity(
      context,
      0,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    for (widgetId in appWidgetIds) {
      val views = RemoteViews(context.packageName, R.layout.yaad_widget)
      views.setTextViewText(R.id.widget_brand, brand)
      views.setTextViewText(R.id.widget_title, title)
      views.setTextViewText(R.id.widget_time, time)
      views.setTextViewText(R.id.widget_summary, summary)
      views.setTextViewText(R.id.widget_stat_today, if (today == 1) "1 today" else "$today today")
      views.setTextViewText(R.id.widget_stat_streak, if (streak == 1) "1-day streak" else "$streak-day streak")
      if (overdue > 0) {
        views.setViewVisibility(R.id.widget_badge, View.VISIBLE)
        views.setTextViewText(
          R.id.widget_badge,
          if (overdue > 99) "99+" else overdue.toString(),
        )
      } else {
        views.setViewVisibility(R.id.widget_badge, View.GONE)
      }
      views.setOnClickPendingIntent(R.id.yaad_widget_root, pending)
      appWidgetManager.updateAppWidget(widgetId, views)
    }
  }
}
