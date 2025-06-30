import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  ReactElement,
} from "react"
import {
  Streamlit,
  withStreamlitConnection,
  ComponentProps,
} from "streamlit-component-lib"

declare global {
  interface Window {
    gapi: any
    google: any
  }
}

function GooglePickerComponent({
  args,
  disabled,
  theme,
}: ComponentProps): ReactElement {
  const {
    label = "Choose from Google Drive",
    apiKey,
    appId,
    token,
    scopes = "https://www.googleapis.com/auth/drive.file",
  } = args

  const [isFocused, setIsFocused] = useState(false)
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false)

  // Load Google Picker API
  useEffect(() => {
    if (!window.gapi) {
      const script = document.createElement("script")
      script.src = "https://apis.google.com/js/api.js"
      script.async = true
      script.onload = () => {
        window.gapi.load("client:picker", () => setPickerApiLoaded(true))
      }
      document.body.appendChild(script)
    } else {
      window.gapi.load("client:picker", () => setPickerApiLoaded(true))
    }
  }, [])

  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    Streamlit.setFrameHeight(pickerOpen ? 600 : 80)
  }, [pickerOpen])

  const style: React.CSSProperties = useMemo(() => {
    const primaryColor = theme?.primaryColor ?? "#f63366"
    return {
      border: `1.5px solid ${isFocused ? primaryColor : "#ccc"}`,
      background: isFocused ? primaryColor : "#fff",
      color: isFocused ? "#fff" : "#262730",
      fontWeight: 600,
      fontSize: 16,
      padding: "0.5em 1em",
      borderRadius: "0.25rem",
      marginTop: 8,
      width: "100%",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
      transition: "background 0.2s, color 0.2s, border 0.2s",
      textAlign: "left" as const,
    }
  }, [theme, isFocused, disabled])

  const onFocus = useCallback(() => setIsFocused(true), [])
  const onBlur = useCallback(() => setIsFocused(false), [])

  const showPicker = useCallback(() => {
    setPickerOpen(true)
    if (!window.google?.picker) {
      alert("Google Picker not loaded yet!")
      return
    }
    if (!token) {
      alert("No Google OAuth token provided!")
      return
    }
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.CANCEL) {
          setPickerOpen(false)
        }
        if (data.action === window.google.picker.Action.PICKED) {
          Streamlit.setComponentValue(data.docs)
        }
      })
      .build()

    picker.setVisible(true)
  }, [token, apiKey, appId])

  return (
    <div>
      <label style={{ fontWeight: 500, fontSize: 14, marginBottom: 6 }}>
        {label}
      </label>
      <button
        style={style}
        onClick={showPicker}
        disabled={disabled || !pickerApiLoaded || !token}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        📁 {label}
      </button>
    </div>
  )
}

export default withStreamlitConnection(GooglePickerComponent)
