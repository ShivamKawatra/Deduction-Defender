import asyncio
import unittest

import app as backend_app


class FakeRocketRideClient:
    active_calls = 0
    max_active_calls = 0

    def __init__(self, uri, auth):
        self.uri = uri
        self.auth = auth

    async def connect(self):
        return None

    async def use(self, filepath, env=None):
        type(self).active_calls += 1
        type(self).max_active_calls = max(type(self).max_active_calls, type(self).active_calls)
        await asyncio.sleep(0.05)
        type(self).active_calls -= 1
        return {"token": "test-token"}

    async def send(self, token, payload):
        return {"answer": "ok"}

    async def get_task_status(self, token):
        return "completed"

    async def disconnect(self):
        return None


class PipelineConcurrencyTest(unittest.IsolatedAsyncioTestCase):
    async def test_concurrent_pipeline_calls_are_serialized(self):
        original_client = backend_app.RocketRideClient
        original_env = {
            "ROCKETRIDE_URI": backend_app.os.getenv("ROCKETRIDE_URI"),
            "ROCKETRIDE_APIKEY": backend_app.os.getenv("ROCKETRIDE_APIKEY"),
            "ROCKETRIDE_GEMINI_KEY": backend_app.os.getenv("ROCKETRIDE_GEMINI_KEY"),
        }

        backend_app.RocketRideClient = FakeRocketRideClient
        backend_app.os.environ["ROCKETRIDE_URI"] = "https://example.com"
        backend_app.os.environ["ROCKETRIDE_APIKEY"] = "test-key"
        backend_app.os.environ["ROCKETRIDE_GEMINI_KEY"] = "gemini-key"

        try:
            results = await asyncio.gather(
                backend_app.call_rocketride_pipeline("fake.pipe", "payload one"),
                backend_app.call_rocketride_pipeline("fake.pipe", "payload two"),
            )
            self.assertEqual(len(results), 2)
            self.assertEqual(FakeRocketRideClient.max_active_calls, 1)
        finally:
            backend_app.RocketRideClient = original_client
            for key, value in original_env.items():
                if value is None:
                    backend_app.os.environ.pop(key, None)
                else:
                    backend_app.os.environ[key] = value


if __name__ == "__main__":
    unittest.main()
