import pytest
from streamlit_google_picker.uploaded_file import UploadedFile

@pytest.fixture
def dummy_metadata():
    return {
        "name": "test.txt",
        "id": "abc123",
        "mimeType": "text/plain",
        "url": "https://drive.google.com/file/d/abc123/view",
        "sizeBytes": 4,
    }

@pytest.fixture
def dummy_token():
    return "ya29.token"

def test_uploaded_file_attrs(dummy_metadata, dummy_token):
    f = UploadedFile(dummy_metadata, dummy_token)
    assert f.name == "test.txt"
    assert f.id == "abc123"
    assert f.type == "text/plain"
    assert f.url.startswith("https://")
    assert f.size == 4
    assert f.token == dummy_token

def test_uploaded_file_is_filelike(dummy_metadata, dummy_token):
    f = UploadedFile(dummy_metadata, dummy_token)
    # If you set _bytes, should work:
    data = b"test"
    f._bytes = data
    # Overwrite BytesIO buffer for this test:
    f.seek(0)
    f.write(data)
    f.seek(0)
    assert f.read() == data

def test_uploaded_file_read_lazy(monkeypatch, dummy_metadata, dummy_token):
    # Let's mock download if you implement lazy download
    called = {}
    def fake_download(self):
        called["yes"] = True
        return b"ok"

    f = UploadedFile(dummy_metadata, dummy_token)
    f._bytes = None
    monkeypatch.setattr(UploadedFile, "_download", fake_download)
    # Simulate lazy download if implemented
    result = f.read()
    # If your logic calls _download when _bytes is None
    assert called or result == b"ok"
