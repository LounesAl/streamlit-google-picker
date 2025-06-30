import streamlit as st
from streamlit_oauth import OAuth2Component
import os
import base64
import json

from google_picker import google_picker

from dotenv import load_dotenv
load_dotenv()

# maintenant tu peux lire tes clés comme avant
CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
API_KEY = os.environ.get("GOOGLE_API_KEY")
APP_ID = os.environ.get("GOOGLE_PROJECT_NUMBER")

st.title("Google Picker OAuth2 Example")

# Endpoints Google OAuth2
AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke"

# Scope Google Drive (ajuste si besoin !)
SCOPES = "openid email profile https://www.googleapis.com/auth/drive.file"

def parse_email_from_id_token(id_token):
    """Décode le JWT pour récupérer l'email utilisateur."""
    payload = id_token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.b64decode(payload))["email"]

if "auth" not in st.session_state or "token" not in st.session_state:
    # OAuth2 flow (login Google)
    oauth2 = OAuth2Component(
        CLIENT_ID,
        CLIENT_SECRET,
        AUTHORIZE_ENDPOINT,
        TOKEN_ENDPOINT,
        TOKEN_ENDPOINT,
        REVOKE_ENDPOINT,
    )
    result = oauth2.authorize_button(
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
        # Stockage du token et email dans la session
        id_token = result["token"]["id_token"]
        st.session_state["auth"] = parse_email_from_id_token(id_token)
        st.session_state["token"] = result["token"]
        st.success(f"Connecté comme {st.session_state['auth']}")
        st.rerun()
    st.stop()

# ==== Utilisateur authentifié ====
st.success(f"Connecté comme {st.session_state['auth']}")
token = st.session_state["token"]["access_token"]

# ==== Google Picker Component ====
result = google_picker(
    label="Pick your file from Google Drive",
    token=token,
    apiKey=API_KEY,
    appId=APP_ID,
    # scopes=SCOPES,  # Tu peux passer scopes si tu veux customiser côté JS
)
st.write("Result from Picker:", result)

# Option logout
if st.button("Logout"):
    del st.session_state["auth"]
    del st.session_state["token"]
    st.rerun()
