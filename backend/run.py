"""Dev entrypoint: flask --app run or python run.py"""
import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(
        host="0.0.0.0",
        port=port,
        debug=True,
        # watchdog reloader on Windows fires on .pyc writes in site-packages
        # and stdlib, causing an infinite restart loop. The stat reloader only
        # polls files Python has actually imported — much more reliable.
        reloader_type="stat",
    )

