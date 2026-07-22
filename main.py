"""Compatibility entry point for running LocalChat from the project root."""

from backend.app.main import app as app

if __name__ == "__main__":
    import threading
    import webbrowser

    import uvicorn

    from backend.app.config import get_settings

    settings = get_settings()
    if settings.open_browser:
        url = f"http://127.0.0.1:{settings.port}"
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    uvicorn.run(
        "backend.app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
    )
