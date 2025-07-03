import React, { useCallback, useEffect, useState, ReactElement } from "react"
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

// Helper to map file types/extensions to Google Picker mimetypes
const EXT_TO_MIME: { [key: string]: string } = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  // add more as needed
}

function GooglePickerComponent({
  args,
  disabled,
  theme,
}: ComponentProps): ReactElement {
  const {
    apiKey,
    appId,
    token,
    scopes = "https://www.googleapis.com/auth/drive.file",
    accept_multiple_files = false,
    type = null,
    allow_folders = true,
    view_ids = null,
    nav_hidden = false,
  } = args

  // === Loader ===
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false)
  const [buttonHover, setButtonHover] = useState(false)
  const [buttonFocus, setButtonFocus] = useState(false)

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

  // === Picker logic ===
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

    // Build Views
    let views: any[] = []
    // If view_ids are provided, use them, else default to DOCS
    let viewIds = view_ids || ["DOCS"]

    viewIds.forEach((vid: string) => {
      if (vid === "FOLDERS") {
        const folderView = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
          .setSelectFolderEnabled(true)
          .setIncludeFolders(true)
        views.push(folderView)
      } else {
        const docView = new window.google.picker.DocsView(window.google.picker.ViewId[vid] || vid)
          .setSelectFolderEnabled(allow_folders)
          .setIncludeFolders(allow_folders)
        // File type filter
        if (type) {
          let mimes: string[] = []
          if (Array.isArray(type)) {
            mimes = type.map((t: string) => EXT_TO_MIME[t] || t)
          } else if (typeof type === "string") {
            mimes = [EXT_TO_MIME[type] || type]
          }
          docView.setMimeTypes(mimes.join(","))
        }
        views.push(docView)
      }
    })

    let pickerBuilder = new window.google.picker.PickerBuilder()
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.CANCEL) {
          setPickerOpen(false)
        }
        if (data.action === window.google.picker.Action.PICKED) {
          Streamlit.setComponentValue(
            accept_multiple_files ? data.docs : data.docs?.[0] || null
          )
          setPickerOpen(false)
        }
      })

    // Add views
    views.forEach((v) => pickerBuilder.addView(v))

    // Enable multi-select (feature only works for some views, mostly "MY_DRIVE" and "DOCS")
    if (accept_multiple_files && window.google.picker.Feature) {
      pickerBuilder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
    }

    // Hide navigation if requested
    if (nav_hidden && window.google.picker.Feature) {
      pickerBuilder.enableFeature(window.google.picker.Feature.NAV_HIDDEN)
    }

    pickerBuilder.build().setVisible(true)
  }, [token, apiKey, appId, accept_multiple_files, type, allow_folders, view_ids, nav_hidden])

  // === SVG Google Drive ===
  const driveIcon = (
    <svg xmlns="http://www.w3.org/2000/svg"
         width="32" height="32" viewBox="0 -960 960 960" fill="#98A6C3"
         style={{marginRight: 16, marginLeft: 2, flex: "none"}}>
      <path d="M220-100q-17 0-34.5-10.5T160-135L60-310q-8-14-8-34.5t8-34.5l260-446q8-14 25.5-24.5T380-860h200q17 0 34.5 10.5T640-825l182 312q-23-6-47.5-8t-48.5 2L574-780H386L132-344l94 164h316q11 23 25.5 43t33.5 37H220Zm70-180-29-51 183-319h72l101 176q-17 13-31.5 28.5T560-413l-80-139-110 192h164q-7 19-10.5 39t-3.5 41H290Zm430 160v-120H600v-80h120v-120h80v120h120v80H800v120h-80Z"/>
    </svg>
  )

  // === CSS Styles ===
  const uploaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    background: "#F0F2F6",
    borderRadius: 8,
    width: "100%",
    minHeight: 79,
    boxSizing: "border-box",
    padding: 16,
    justifyContent: "space-between",
    gap: 10,
    margin: 0,
    fontFamily: '"Source Sans", sans-serif',
    fontSize: 14
  }

  const infoStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  }

  const textsStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: 3,
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 400,
    color: "#31333F",
    marginBottom: 0,
    fontFamily: '"Source Sans", sans-serif',
    lineHeight: "22px",
  }

  const subtitleStyle: React.CSSProperties = {
    fontSize: 14,
    color: "#31333F",
    marginTop: 0,
    fontFamily: '"Source Sans", sans-serif',
    lineHeight: "18px",
    opacity: 0.7,
  }

  const buttonStyle: React.CSSProperties = {
    fontWeight: 400,
    fontSize: "inherit",
    fontFamily: "inherit",
    background: "#fff",
    borderColor: "rgba(49, 51, 63, 0.2)",
    color: "#31333F",
    border: "1px solid rgba(49, 51, 63, 0.2)",
    borderRadius: "0.5rem",
    padding: "0.25rem 0.75rem",
    minHeight: "2.5rem",
    lineHeight: 1.6,
    margin: 0,
    width: "auto",
    userSelect: "none",
    boxSizing: "border-box",
    cursor: disabled || !pickerApiLoaded || !token ? "not-allowed" : "pointer",
    opacity: disabled || !pickerApiLoaded || !token ? 0.6 : 1,
    boxShadow: "none",
    outline: "none",
    transition: "border-color 0.16s, background 0.16s, color 0.16s"
  }

  if (buttonHover) {
    buttonStyle.borderColor = "rgb(255, 75, 75)"
    buttonStyle.color = "rgb(255, 75, 75)"
  }

  return (
    <section
      role="presentation"
      tabIndex={0}
      aria-label="Pick from Google Drive"
      style={uploaderStyle}
      data-testid="stFileUploaderDropzone"
    >
      <div style={infoStyle}>
        {driveIcon}
        <div style={textsStyle}>
          <span style={titleStyle}>Pick files from Google Drive</span>
          <small style={subtitleStyle}>Limit 200MB per file</small>
        </div>
      </div>
      <button
        style={buttonStyle}
        onClick={showPicker}
        disabled={disabled || !pickerApiLoaded || !token}
        aria-label="Pick file from Drive"
        data-testid="stBaseButton-secondary"
        onMouseEnter={() => setButtonHover(true)}
        onMouseLeave={() => setButtonHover(false)}
        onFocus={() => setButtonFocus(true)}
        onBlur={() => setButtonFocus(false)}
      >
        Browse Drive
      </button>
    </section>
  )
}

export default withStreamlitConnection(GooglePickerComponent)
