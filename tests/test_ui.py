from unittest.mock import patch

from fastapi.testclient import TestClient
from streamlit.testing.v1 import AppTest

from app.main import app
from ui.client import APIError


def test_dashboard_workflows(monkeypatch):
    monkeypatch.setenv("AI_BACKEND", "test")
    api = TestClient(app)

    def request(self, method, path, json=None):
        response = api.request(method, path, json=json)
        response.raise_for_status()
        return response.json()

    with patch("ui.client.APIClient.request", request):
        ui = AppTest.from_file("../ui/app.py", default_timeout=30).run()
        assert not ui.exception
        ui.text_area[0].set_value("How do I change my website logo?")
        ui.button[0].click().run()
        assert ui.session_state["knowledge_result"]["sources"]
        ui.sidebar.radio[0].set_value("Inbox Review").run()
        ui.text_input[0].set_value("customer@example.com")
        ui.text_input[1].set_value("Logo help")
        ui.text_area[0].set_value("How do I change my website logo?")
        ui.button[0].click().run()
        assert ui.session_state["inbox_result"]["email_id"]
        ui.sidebar.radio[0].set_value("Scope Builder").run()
        ui.text_input[0].set_value("ui-demo")
        ui.text_input[1].set_value("meeting-01")
        ui.text_area[0].set_value("We want better search and product filters.")
        ui.button[0].click().run()
        assert ui.session_state["scope_result"]["requirements"]
        assert not ui.exception


def test_dashboard_handles_offline_api():
    with patch("ui.client.APIClient.request", side_effect=APIError("API is unavailable.")):
        ui = AppTest.from_file("../ui/app.py").run(timeout=30)
        assert not ui.exception
        assert ui.error
