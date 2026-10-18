"""Small synchronous API client with errors safe to display in the UI."""

from urllib.parse import urlsplit

import httpx


class APIError(Exception):
    """A readable API failure containing no server response or credentials."""


class APIClient:
    """Reuse a connection pool for API requests; requests are never retried."""

    def __init__(self, base_url: str):
        invalid_url = (
            "Enter a valid HTTP or HTTPS API base URL with a host and without "
            "credentials, a query, or a fragment."
        )
        try:
            if not isinstance(base_url, str) or not base_url:
                raise ValueError
            if any(character.isspace() or ord(character) < 32 for character in base_url):
                raise ValueError
            parsed = urlsplit(base_url)
            if (
                parsed.scheme.lower() not in {"http", "https"}
                or not parsed.hostname
                or parsed.username is not None
                or parsed.password is not None
                or "?" in base_url
                or "#" in base_url
                or "\\" in base_url
            ):
                raise ValueError
            # Accessing port also validates malformed or out-of-range ports.
            parsed.port
            url = httpx.URL(base_url)
            if not url.host or url.userinfo:
                raise ValueError
        except (ValueError, TypeError, httpx.InvalidURL):
            raise APIError(invalid_url) from None

        self._client = httpx.Client(
            base_url=str(url).rstrip("/") + "/",
            timeout=30.0,
            follow_redirects=False,
            trust_env=False,
        )

    def request(self, method: str, path: str, json=None) -> dict | list:
        """Make one request and return a JSON object or array."""
        try:
            # Restrict requests to this client's configured API origin.
            parsed = urlsplit(path)
            if (
                not isinstance(path, str)
                or parsed.scheme
                or parsed.netloc
                or path.startswith("//")
                or "\\" in path
                or parsed.fragment
            ):
                raise ValueError
        except (TypeError, ValueError, AttributeError):
            raise APIError("Use a relative API endpoint path.") from None

        try:
            response = self._client.request(method, path, json=json)
        except httpx.TimeoutException:
            raise APIError(
                "The API request timed out after 30 seconds. Check the API's "
                "status before submitting again."
            ) from None
        except httpx.ConnectError:
            raise APIError(
                "Could not connect to the API. Check the base URL and that the API is running."
            ) from None
        except httpx.HTTPError:
            raise APIError(
                "The API connection failed. Check the API's status before submitting again."
            ) from None
        except (httpx.InvalidURL, ValueError, TypeError, RuntimeError):
            raise APIError("The API request could not be prepared or sent.") from None

        status = response.status_code
        if status in {401, 403}:
            raise APIError(
                "API access was denied. Check your API access configuration."
            )
        if 400 <= status < 500:
            raise APIError(f"The API rejected the request (HTTP {status}). Check your input.")
        if status >= 500:
            raise APIError(f"The API encountered a server error (HTTP {status}).")
        if not 200 <= status < 300:
            raise APIError(f"The API returned an unexpected status (HTTP {status}).")

        try:
            result = response.json()
        except (ValueError, UnicodeError, RecursionError):
            raise APIError("The API returned malformed JSON. Expected an object or a list.") from None
        if not isinstance(result, (dict, list)):
            raise APIError("The API returned unexpected JSON. Expected an object or a list.")
        return result

    def close(self) -> None:
        """Release the client's pooled connections."""
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()
