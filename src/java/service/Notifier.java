package service;

public interface Notifier {
    enum Level {
        INFO, WARN, CRITICAL, RECOVERY
    }

    void send(String code, Level level, String message);
}
