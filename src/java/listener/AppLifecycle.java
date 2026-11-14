package listener;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.annotation.WebListener;
import service.AlertService;
import service.DiscordNotifier;
import service.Heartbeat;

@WebListener
public class AppLifecycle implements ServletContextListener {

    @Override
    public void contextInitialized(ServletContextEvent sce) {
        System.out.println("[AppLifecycle] ServletContext initialized. Starting AlertService and Heartbeat...");
        AlertService.start(new DiscordNotifier());
        Heartbeat.start();
    }

    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        System.out.println("[AppLifecycle] ServletContext destroyed. Stopping AlertService and Heartbeat...");
        AlertService.stop();
        Heartbeat.stop();
    }
}
