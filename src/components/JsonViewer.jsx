import React, { useState, useMemo, useCallback, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";

const deepEqual = (a, b) => {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => keysB.includes(key) && deepEqual(a[key], b[key]));
};
import {
  WrapText,
  Minimize2,
  Hash,
  Copy,
  Edit,
  CheckCircle,
  SquareStack,
  Star,
  Send,
  Layers2,
  Check
} from "lucide-react";
import { t } from "../utils/i18n.js";
import "../styles/JsonViewer.css";


const JsonViewer = ({
  data,
  className = "",
  showControls = true,
  onCopy = null,
  copyButtonText = t("jsonViewer.controls.copy"),
  copiedText = t("jsonViewer.controls.copied"),
  isCopied: isCopiedProp = false,
  readOnly = true,
  onChange = null,
  enableWrap = true,
  enableNestedParse = true,
  onAddToFavorites = null,
  showFavoritesButton = false,
  onSimulate = null,
  // New props
  showNestedParseButton = true, // Control existing nested parse button
  showSimulateNestedParseButton = false, // Control button specifically for Simulate Message
  onSimulateNestedParse = null, // Callback for Simulate Message specific nested parse
}) => {
  // Set initial wrap value based on content type: JSON defaults to no wrap, non-JSON defaults to wrap
  const [textWrap, setTextWrap] = useState(() => {
    // In read-only mode, auto wrap based on content type; in editable mode, default to no wrap
    if (!readOnly) return false;
    if (typeof data === 'string') {
      try {
        JSON.parse(data);
        return false; // Is JSON
      } catch {
        return true; // Is not JSON
      }
    }
    return true;
  });

  // Listen for data changes, automatically switch textWrap initial value (only if user hasn't manually toggled, and in read-only mode)
  const [userToggledWrap, setUserToggledWrap] = useState(false);
  useEffect(() => {
    if (!readOnly) return; // Do not auto-toggle wrap in editable mode
    if (!userToggledWrap) {
      if (typeof data === 'string') {
        try {
          JSON.parse(data);
          setTextWrap(false);
        } catch {
          setTextWrap(true);
        }
      } else {
        setTextWrap(true);
      }
    }
  }, [data, userToggledWrap, readOnly]);
  const [collapsed, setCollapsed] = useState(false);
  const [nestedParse, setNestedParse] = useState(false); // Default to no nested parsing
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  // Recursively parse nested JSON strings
  const parseNestedJson = useCallback((obj) => {
    if (typeof obj === "string") {
      try {
        const parsed = JSON.parse(obj);
        // Only parse if the result is an object or array, not primitive values
        // This prevents converting string numbers like '123' to numbers 123
        if (typeof parsed === "object" && parsed !== null) {
          // Recursively parse nested JSON
          return parseNestedJson(parsed);
        }
        // Keep primitive values as strings
        return obj;
      } catch {
        return obj;
      }
    } else if (Array.isArray(obj)) {
      return obj.map((item) => parseNestedJson(item));
    } else if (obj && typeof obj === "object") {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = parseNestedJson(value);
      }
      return result;
    }
    return obj;
  }, []);

  // Detect and parse JSON
  const {
    isValidJson,
    parsedData,
    displayData,
    nestedParsedData,
    hasNestedData,
  } = useMemo(() => {

    if (!data || typeof data !== "string") {
      return {
        isValidJson: false,
        parsedData: null,
        displayData: String(data || ""),
        nestedParsedData: null,
        hasNestedData: false,
      };
    }

    try {
      const parsed = JSON.parse(data);
      const nestedParsed = parseNestedJson(parsed);

      // Check if nested parsing actually found nested JSON using shallow comparison
      const hasNestedData = !deepEqual(parsed, nestedParsed);

      return {
        isValidJson: true,
        parsedData: parsed,
        displayData: data,
        nestedParsedData: nestedParsed,
        hasNestedData,
      };
    } catch {
      return {
        isValidJson: false,
        parsedData: null,
        displayData: data,
        nestedParsedData: null,
        hasNestedData: false,
      };
    }
  }, [data, parseNestedJson, forceUpdate]);

  // Get display content
  const getDisplayContent = () => {
    if (!isValidJson) {
      return displayData;
    }

    // Apply formatting and transformations
    const jsonData = nestedParse ? nestedParsedData : parsedData;
    return JSON.stringify(jsonData, null, collapsed ? 0 : 2);
  };

  const handleCopyClick = () => {
    const copyData = getDisplayContent();
    if (onCopy) {
      onCopy(copyData);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      // Default copy implementation
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(copyData)
          .then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
          })
          .catch((err) => {
            fallbackCopyTextToClipboard(copyData);
          });
      } else {
        fallbackCopyTextToClipboard(copyData);
      }
    }
  };

  // Fallback copy method (for older browsers or non-secure contexts)
  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }

    document.body.removeChild(textArea);
  };

  const handleAddToFavorites = () => {
    if (onAddToFavorites) {
      const favoriteData = getDisplayContent();
      onAddToFavorites(favoriteData);
    }
  };

  const handleChange = useCallback(
    (value) => {
      if (onChange && !readOnly) {
        if (nestedParse) {
          try {
            // Try to parse and apply nested parsing
            const parsed = JSON.parse(value);
            const nestedParsed = parseNestedJson(parsed);
            const formattedContent = JSON.stringify(
              nestedParsed,
              null,
              collapsed ? 0 : 2
            );
            onChange(formattedContent);
            return;
          } catch (error) {
            // If parsing fails, use original value
          }
        }
        onChange(value);
      }
    },
    [onChange, readOnly, nestedParse, parseNestedJson, collapsed]
  );

  // Handle formatting changes in edit mode
  const handleFormatChange = useCallback(
    (newCollapsed, newNestedParse) => {
      if (!readOnly && onChange && isValidJson) {
        try {
          const jsonData = newNestedParse ? nestedParsedData : parsedData;
          const formattedContent = JSON.stringify(
            jsonData,
            null,
            newCollapsed ? 0 : 2
          );
          onChange(formattedContent);
        } catch (error) {
          console.error("Error formatting JSON:", error);
        }
      }
    },
    [readOnly, onChange, isValidJson, nestedParsedData, parsedData]
  );

  const handleCollapsedChange = useCallback(
    (e) => {
      const newCollapsed = e.target.checked;
      setCollapsed(newCollapsed);
      handleFormatChange(newCollapsed, nestedParse);
    },
    [handleFormatChange, nestedParse]
  );

  const handleNestedParseChange = useCallback(
    (newNestedParse) => {
      setNestedParse(newNestedParse);
      handleFormatChange(collapsed, newNestedParse);

      // Force a re-render to ensure UI updates
      setForceUpdate((prev) => prev + 1);
    },
    [handleFormatChange, collapsed, nestedParse, hasNestedData]
  );

  // No longer auto-switch nestedParse due to data changes, only user operation switches

  // Handler for Simulate Message specific nested parse button
  const [simulateNestedParsed, setSimulateNestedParsed] = useState(false);
  const handleSimulateNestedParse = useCallback(() => {
    if (hasNestedData && isValidJson && onSimulateNestedParse && !simulateNestedParsed) {
      try {
        // Only do nested parse once
        const parsed = JSON.parse(data);
        const nestedParsed = parseNestedJson(parsed);
        const formattedContent = JSON.stringify(nestedParsed, null, collapsed ? 0 : 2);
        onSimulateNestedParse(formattedContent);
        setSimulateNestedParsed(true);
      } catch {
        // ignore
      }
    }
  }, [hasNestedData, isValidJson, onSimulateNestedParse, data, parseNestedJson, collapsed, simulateNestedParsed]);

  // Reset button state when Simulate Message panel switches content
  useEffect(() => {
    setSimulateNestedParsed(false);
  }, [data]);

  const content = getDisplayContent();

  // CodeMirror extensions configuration
  const extensions = [
    isValidJson ? json() : [],
    EditorView.theme({
      "&": {
        fontSize: "12px",
        height: "100%",
        backgroundColor: "#262626", // Editor background color
      },
      ".cm-editor": {
        height: "100%",
      },
      ".cm-scroller": {
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        lineHeight: "1.3",
        overflow: "auto",
      },
      ".cm-focused": {
        outline: "none",
      },
      ".cm-editor.cm-focused": {
        outline: "none",
      },
      ".cm-content": {
        padding: "8px",
        minHeight: "100%",
      },
      ".cm-gutters": {
        backgroundColor: "#333333", // Line number area background color
        borderRight: "1px solid #404040",
      },
      "&.cm-editor.cm-focused .cm-selectionBackground": {
        backgroundColor: "rgba(0, 122, 204, 0.3)",
      },
      ".cm-line": {
        lineHeight: "1.3",
      },
    }),
    textWrap ? EditorView.lineWrapping : [],
    EditorView.editable.of(!readOnly),
    EditorState.readOnly.of(readOnly),
  ].filter(Boolean);

  return (
    <div className={`json-viewer ${className}`}>
      {showControls && (
        <div className="json-viewer-controls">
          <div className="json-viewer-controls-left">
            {enableWrap && (
              <button
                onClick={() => {
                  setTextWrap(!textWrap);
                  setUserToggledWrap(true);
                }}
                className={`json-viewer-btn btn-wrap ${
                  textWrap ? "json-viewer-btn-active-green" : "json-viewer-btn-inactive"
                }`}
                title={t("jsonViewer.tooltips.wrapText")}
              >
                <WrapText size={14} color="currentColor" />
                <span>{t("jsonViewer.controls.wrap")}</span>
              </button>
            )}

            {/* Original nested parse button */}
            {enableNestedParse && showNestedParseButton && (
              <button
                onClick={() => {
                  const newNestedParse = !nestedParse;
                  handleNestedParseChange(newNestedParse);
                }}
                className={`json-viewer-btn btn-nested ${
                  nestedParse ? "json-viewer-btn-active-purple" : "json-viewer-btn-inactive"
                } ${!hasNestedData ? "json-viewer-btn-disabled" : ""}`}
                title={hasNestedData ? t("jsonViewer.tooltips.nestedParseJson") : t("jsonViewer.tooltips.noNestedData")}
                disabled={!hasNestedData}
              >
                <Layers2 size={14} />
                <span>{t("jsonViewer.controls.nestedParse")}</span>
              </button>
            )}

            {/* Simulate Message specific nested parse button */}
            {enableNestedParse && showSimulateNestedParseButton && (
              <button
                onClick={handleSimulateNestedParse}
                className={`json-viewer-btn btn-nested-simulate ${
                  simulateNestedParsed || !hasNestedData ? "json-viewer-btn-disabled" : "json-viewer-btn-inactive"
                }`}
                title={
                  hasNestedData
                    ? t("jsonViewer.tooltips.simulateNestedParseJson") || "Simulate Nested Parse"
                    : t("jsonViewer.tooltips.noNestedData")
                }
                disabled={simulateNestedParsed || !hasNestedData}
              >
                <Layers2 size={14} />
                                    <span>{t("jsonViewer.controls.simulateNestedParse") || "Simulate Nested Parse"}</span>
              </button>
            )}
          </div>

          <div className="json-viewer-controls-right">
            {/* Action buttons */}
            <div className="json-viewer-action-buttons">
              {/* Simulate button */}
              {onSimulate && (
                <button
                  onClick={() => onSimulate(getDisplayContent())}
                  className="json-viewer-btn btn-simulate json-viewer-btn-inactive"
                  title={t("jsonViewer.tooltips.simulate") || "Simulate this message"}
                >
                  <Send size={14} />
                </button>
              )}

              <button
                onClick={handleCopyClick}
                className={`json-viewer-btn btn-copy ${
                  isCopied ? "json-viewer-btn-active-green" : "json-viewer-btn-inactive"
                }`}
                title={
                  isCopied
                    ? t("jsonViewer.tooltips.copied") || t("jsonViewer.controls.copied")
                    : t("jsonViewer.tooltips.copy") || t("jsonViewer.controls.copy")
                }
              >
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>

              {showFavoritesButton && onAddToFavorites && (
                <button
                  onClick={handleAddToFavorites}
                  className="json-viewer-btn btn-favorite json-viewer-btn-inactive"
                  title={t("jsonViewer.tooltips.addToFavorites")}
                >
                  <Star size={14} />
                </button>
              )}
            </div>

            {/* Divider if we have action buttons and status badges */}
            {(!readOnly || (readOnly && isValidJson) || hasNestedData) && <div className="json-viewer-divider" />}
            {readOnly && isValidJson && (
              <div className="json-viewer-badge json-viewer-badge-green">
                <CheckCircle size={12} />
                <span>{t("jsonViewer.status.json")}</span>
              </div>
            )}
            {/* Debug info */}
            {hasNestedData && (
              <div className="json-viewer-badge json-viewer-badge-purple">
                <Layers2 size={12} />
                <span>{t("jsonViewer.status.nested")}</span>
              </div>
            )}
            {/* Status badges */}
            {!readOnly && (
              <div className="json-viewer-badge json-viewer-badge-yellow">
                <Edit size={12} />
                <span>{t("jsonViewer.status.edit")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="json-viewer-container">
        <CodeMirror
          value={content}
          onChange={handleChange}
          extensions={extensions}
          theme={oneDark}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: !readOnly,
            bracketMatching: true,
            closeBrackets: !readOnly,
            autocompletion: !readOnly,
            highlightSelectionMatches: false,
            searchKeymap: true,
          }}
          className="json-viewer-codemirror"
        />
      </div>
    </div>
  );
};

export default JsonViewer;
