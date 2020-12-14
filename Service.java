import io.javalin.Javalin;
import static io.javalin.apibuilder.ApiBuilder.*;

public class Service {
    public static void main(String[] args) {
        Javalin app = Javalin.create(config -> {
            config.defaultContentType = "application/json";
            config.addStaticFiles("/public");
            config.enableCorsForAllOrigins();
        }).routes(() -> {
            path("users", () -> {
                get(UserController::getAll);
                post(UserController::create);
                path(":user-id", () -> {
                    get(UserController::getOne);
                    patch(UserController::update);
                    delete(UserController::delete);
                });
                ws("events", userController::webSocketEvents);
            });
        }).start(port);
    }
}
