# /// script
# dependencies = [
#   "python-dotenv>=1.0.1",
#   "streamlit-oauth>=0.1.14",
# ]
# ///


import streamlit as st
from streamlit_oauth import OAuth2Component
import os
import base64
import json

from streamlit_google_picker import google_picker
from streamlit_google_picker.uploaded_file import get_uploaded_file_cache

from dotenv import load_dotenv
load_dotenv()

# maintenant tu peux lire tes clés comme avant
CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
API_KEY = os.environ.get("GOOGLE_API_KEY")
APP_ID = CLIENT_ID.split("-")[0]

# Endpoints Google OAuth2
SECRETS_FILE = "secrets.json"
AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke"
SCOPES = "openid email profile https://www.googleapis.com/auth/drive.file"

def secrets_file_exists():
    """Returns True if secrets.json exists and contains 'auth' and 'token' keys."""
    if not os.path.exists(SECRETS_FILE):
        return False
    try:
        with open(SECRETS_FILE, "r") as f:
            secrets = json.load(f)
        return secrets is not None and "token" in secrets
    except Exception:
        return False

def read_auth_from_secrets():
    """Reads auth and token from secrets.json."""
    with open(SECRETS_FILE, "r") as f:
        secrets = json.load(f)
    return secrets["token"]

def save_auth_to_secrets(token):
    """Saves auth and token to secrets.json."""
    secrets = {"token": token}
    with open(SECRETS_FILE, "w") as f:
        json.dump(secrets, f)
        
def get_oauth():
    return OAuth2Component(
            CLIENT_ID,
            CLIENT_SECRET,
            AUTHORIZE_ENDPOINT,
            TOKEN_ENDPOINT,
            TOKEN_ENDPOINT,
            REVOKE_ENDPOINT,
        )

st.set_page_config(
    page_title="Google Picker",
    page_icon="🧊",
    layout="wide",
    initial_sidebar_state="expanded",
)

def st_normal():
    _, col, _ = st.columns([2, 6, 2])
    return col

with st_normal():
    st.title("Streamlit Google Picker")

    if "name" in st.session_state and st.session_state["name"]:
        st.write("Hi " + st.session_state["name"])

    def parse_name_from_id_token(id_token):
        """Décode le JWT pour récupérer l'email utilisateur."""
        payload = id_token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        print(json.loads(base64.b64decode(payload)))
        return json.loads(base64.b64decode(payload))["given_name"]
    
    if secrets_file_exists():
        st.session_state["token"] = read_auth_from_secrets()
        new_token = get_oauth().refresh_token(st.session_state["token"])
        new_token.setdefault("refresh_token", st.session_state["token"]["refresh_token"])
        st.session_state["token"] = new_token
        save_auth_to_secrets(new_token)
        
    elif "auth" not in st.session_state or "token" not in st.session_state:
        # OAuth2 flow (login Google)
        result = get_oauth().authorize_button(
            name="Continue with Google",
            icon="https://www.google.com.tw/favicon.ico",
            redirect_uri="http://localhost:8501",
            scope=SCOPES,
            key="google",
            extras_params={"prompt": "consent", "access_type": "offline"},
            use_container_width=True,
            pkce='S256',
        )
        if result:
            # Store token and email in the session
            st.session_state["token"] = result["token"]
            st.session_state["name"] = parse_name_from_id_token(result["token"]["id_token"])
            save_auth_to_secrets(result["token"])
            st.rerun()
        st.stop()

    # ==== Authenticated user ====
    access_token = st.session_state["token"]["access_token"]

    # ==== Google Picker Component ====
    grive_uploaded_files = google_picker(
        label="Pick files from Google Drive",
        token=access_token,
        apiKey=API_KEY,
        appId=APP_ID,
        accept_multiple_files=True,                     # Enable multi-select (like st.file_uploader)
        type=["pdf", "png"],                            # Restrict to pdf, png
        allow_folders=True,                             # Allow folder selection
        view_ids=None,                                  # Tabs: DOCS, Spreadsheets, FOLDERS (custom views)
        nav_hidden=True,                                # Show navigation pane
        key="google_picker"
    )
    for f in grive_uploaded_files:
        st.write(f"Filename: {f.name}, Size: {f.size}")
        data = f.read()
        # Save to local disk
        if False : 
            with open(f.name, "wb") as out_file:
                out_file.write(data)
    st.write("Files in memory : ", len(get_uploaded_file_cache()))
        
        
    uploaded_files = st.file_uploader(
        "Choose from Local Storage", 
        accept_multiple_files=True,
        label_visibility='hidden',
        width='stretch'
    )
    if uploaded_files:
        for f in uploaded_files:
            st.write(f"Filename: {f.name}, Size: {f.size}")
            data = f.read()
            # Save to local disk
            if False : 
                with open(f.name, "wb") as out_file:
                    out_file.write(data)

    # Option logout
    if st.button("Logout"):
        del st.session_state["token"]
        del st.session_state["name"]
        os.remove(SECRETS_FILE)
        st.rerun()
