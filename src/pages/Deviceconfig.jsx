// ── src/pages/Deviceconfig.jsx ────────────────────────────────────────
import {
  Box, Typography, Button, CircularProgress,
  Switch, Select, MenuItem,
  TextField, InputLabel, FormControl, Alert,
  Snackbar, Divider, IconButton, Tooltip,
} from "@mui/material";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getConfig, saveConfig } from "../services/api";

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────
const RELAY_META = [
  { key: "fan",   icon: "🌀", label: "Fan",   color: "#38bdf8", borderColor: "rgba(56,189,248,0.3)",  bg: "rgba(56,189,248,0.05)"  },
  { key: "motor", icon: "⚙️",  label: "Motor", color: "#a3e635", borderColor: "rgba(163,230,53,0.3)",  bg: "rgba(163,230,53,0.05)"  },
  { key: "light", icon: "💡", label: "Light", color: "#fbbf24", borderColor: "rgba(251,191,36,0.3)",  bg: "rgba(251,191,36,0.05)"  },
];

const PARAMETERS    = ["temperature", "humidity", "soil", "soilStatus"];
const OPERATORS     = ["<", ">", "==", "<=", ">="];
const LOGIC_OPTIONS = ["AND", "OR"];

const RELAY_DEFAULTS = {
  fan:   { parameter: "temperature", operator: ">",  value: 1   },
  motor: { parameter: "soil",        operator: ">",  value: 1 },
  light: { parameter: "temperature", operator: "<",  value: 1   },
};

const FAN_SCHEDULE_DEFAULT = {
  enabled: false,
  type: "hourly",
  startMinute: 0,
  durationMinutes: 2,
};

const FIXED_TIME_ENTRY_DEFAULT = {
  hour: 9,
  minute: 0,
  durationSeconds: 30,
};

const FIXED_TIMES_SCHEDULE_DEFAULT = {
  enabled: false,
  type: "fixed_times",
  entries: [{ ...FIXED_TIME_ENTRY_DEFAULT }],
};

function getDefaultSchedule(key) {
  return key === "fan"
    ? { ...FAN_SCHEDULE_DEFAULT }
    : { ...FIXED_TIMES_SCHEDULE_DEFAULT, entries: [{ ...FIXED_TIME_ENTRY_DEFAULT }] };
}

function normalizeFixedTimeEntry(entry) {
  return {
    hour: Number.isFinite(Number(entry?.hour)) ? Math.min(23, Math.max(0, Number(entry.hour))) : FIXED_TIME_ENTRY_DEFAULT.hour,
    minute: Number.isFinite(Number(entry?.minute)) ? Math.min(59, Math.max(0, Number(entry.minute))) : FIXED_TIME_ENTRY_DEFAULT.minute,
    durationSeconds: Number.isFinite(Number(entry?.durationSeconds)) ? Math.max(1, Number(entry.durationSeconds)) : FIXED_TIME_ENTRY_DEFAULT.durationSeconds,
  };
}

function makeDefaultRelay(key) {
  const relay = {
    enabled:    true,
    logic:      "AND",
    conditions: [{ ...RELAY_DEFAULTS[key] }],
  };

  relay.schedule = getDefaultSchedule(key);

  return relay;
}

function safeCondition(c, key) {
  const def = RELAY_DEFAULTS[key];
  return {
    parameter: PARAMETERS.includes(c?.parameter) ? c.parameter : def.parameter,
    operator:  OPERATORS.includes(c?.operator)   ? c.operator  : def.operator,
    value:     (c?.value !== undefined && c?.value !== null && c?.value !== "")
                 ? c.value : def.value,
  };
}

// Normalise any API shape into the canonical { enabled, logic, conditions[] } shape.
// Handles: new format, old flat format, empty/null/undefined, partial fields.
function normaliseRelay(raw, key) {
  const def = RELAY_DEFAULTS[key];

  if (!raw || typeof raw !== "object") return makeDefaultRelay(key);

  let conditions;

  if (Array.isArray(raw.conditions) && raw.conditions.length > 0) {
    // New format — map every condition through safeCondition to fill gaps
    conditions = raw.conditions.map((c) => safeCondition(c, key));
  } else if (
    raw.parameter !== undefined ||
    raw.operator  !== undefined ||
    raw.value     !== undefined
  ) {
    // Old flat format { parameter, operator, value }
    conditions = [safeCondition(raw, key)];
  } else if (Array.isArray(raw.conditions) && raw.conditions.length === 0) {
    // Explicitly empty array stored → use default
    conditions = [{ ...def }];
  } else {
    conditions = [{ ...def }];
  }

  // Final guard: every condition MUST have all three fields defined
  conditions = conditions.map((c) => ({
    parameter: PARAMETERS.includes(c?.parameter) ? c.parameter : def.parameter,
    operator:  OPERATORS.includes(c?.operator)   ? c.operator  : def.operator,
    value:     (c?.value !== undefined && c?.value !== null && c?.value !== "")
                 ? c.value : def.value,
  }));

  const relay = {
    enabled:    typeof raw.enabled === "boolean" ? raw.enabled : true,
    logic:      raw.logic === "OR" ? "OR" : "AND",
    conditions,
  };

  const defaultSchedule = getDefaultSchedule(key);
  const schedule = raw.schedule || {};
  const scheduleType = schedule.type === "fixed_times"
    ? "fixed_times"
    : key === "fan"
      ? "hourly"
      : "fixed_times";

  relay.schedule = scheduleType === "hourly"
    ? {
        enabled: typeof schedule.enabled === "boolean" ? schedule.enabled : defaultSchedule.enabled,
        type: "hourly",
        startMinute: Number.isFinite(Number(schedule.startMinute))
          ? Math.min(59, Math.max(0, Number(schedule.startMinute)))
          : FAN_SCHEDULE_DEFAULT.startMinute,
        durationMinutes: Number.isFinite(Number(schedule.durationMinutes))
          ? Math.max(1, Number(schedule.durationMinutes))
          : FAN_SCHEDULE_DEFAULT.durationMinutes,
      }
    : {
        enabled: typeof schedule.enabled === "boolean" ? schedule.enabled : defaultSchedule.enabled,
        type: "fixed_times",
        entries: Array.isArray(schedule.entries) && schedule.entries.length > 0
          ? schedule.entries.slice(0, 5).map(normalizeFixedTimeEntry)
          : defaultSchedule.entries.map((entry) => ({ ...entry })),
      };

  return relay;
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────
const selectSx = (color) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px", color: "#e8f5e9",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
    "& fieldset": { borderColor: "rgba(74,222,128,0.15)" },
    "&:hover fieldset": { borderColor: color || "rgba(74,222,128,0.35)" },
    "&.Mui-focused fieldset": { borderColor: color || "#4ade80", borderWidth: 1 },
  },
  "& .MuiInputLabel-root": { color: "rgba(232,245,233,0.4)", fontSize: 13 },
  "& .MuiInputLabel-root.Mui-focused": { color: color || "#4ade80" },
  "& .MuiSelect-icon": { color: "rgba(232,245,233,0.4)" },
});

const menuPaperSx = {
  background: "rgba(8,15,10,0.98)",
  border: "1px solid rgba(74,222,128,0.15)",
  borderRadius: "10px",
  "& .MuiMenuItem-root": {
    color: "rgba(232,245,233,0.7)",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
    "&:hover": { background: "rgba(74,222,128,0.08)", color: "#4ade80" },
    "&.Mui-selected": { background: "rgba(74,222,128,0.12)", color: "#4ade80" },
  },
};

const textFieldSx = (color) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px", color: "#e8f5e9",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
    "& fieldset": { borderColor: "rgba(74,222,128,0.15)" },
    "&:hover fieldset": { borderColor: color },
    "&.Mui-focused fieldset": { borderColor: color, borderWidth: 1 },
  },
  "& .MuiInputLabel-root": { color: "rgba(232,245,233,0.4)", fontSize: 13 },
  "& .MuiInputLabel-root.Mui-focused": { color },
  "& .MuiFormHelperText-root": { color: "#f87171", fontSize: 10 },
});

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, delay: i * 0.07 } }),
};

// ─────────────────────────────────────────────────────────────────────
// ConditionRow
// KEY FIX: receives the full condition as a prop and calls onChange with
// a complete new object — no local state, no stale closures.
// Uses a stable id (rowId) instead of index as React key so rows don't
// get reused wrongly when conditions are added / removed.
// ─────────────────────────────────────────────────────────────────────
function ConditionRow({ condition, rowId, index, total, color, enabled, relayKey, onChange, onRemove }) {
  const def = RELAY_DEFAULTS[relayKey];

  // Resolve with triple-layer fallback: prop → default → first valid option
  // This guarantees MUI <Select> NEVER receives undefined (causes console warning + broken state)
  const param = PARAMETERS.includes(condition?.parameter)
    ? condition.parameter
    : (PARAMETERS.includes(def.parameter) ? def.parameter : PARAMETERS[0]);

  const op = OPERATORS.includes(condition?.operator)
    ? condition.operator
    : (OPERATORS.includes(def.operator) ? def.operator : OPERATORS[1]);

  const val = (condition?.value !== undefined && condition?.value !== null && condition?.value !== "")
    ? condition.value
    : def.value;

  const isStrParam = param === "soilStatus";

  const isValid = isStrParam
    ? (typeof val === "string" && val.trim() !== "")
    : (String(val) !== "" && !isNaN(Number(val)));

  // Build a complete updated condition object on every field change
  const handleChange = (field, newVal) => {
    const updated = { parameter: param, operator: op, value: val };

    if (field === "parameter") {
      updated.parameter = newVal;
      // Reset value type when switching between string and numeric params
      const becomingStr = newVal === "soilStatus";
      const wasStr      = param === "soilStatus";
      if (becomingStr !== wasStr) {
        updated.value = becomingStr ? "" : RELAY_DEFAULTS[relayKey].value;
      }
    } else if (field === "operator") {
      updated.operator = newVal;
    } else if (field === "value") {
      updated.value = newVal;
    }

    onChange(index, updated);
  };

  return (
    <Box sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr 72px", sm: "1fr 80px 120px 36px" },
      gap: 1,
      alignItems: "flex-start",
      mb: 1.5,
    }}>
      {/* Parameter */}
      <FormControl sx={selectSx(color)} size="small">
        <InputLabel>Parameter</InputLabel>
        <Select
          value={param}
          label="Parameter"
          disabled={!enabled}
          onChange={(e) => handleChange("parameter", e.target.value)}
          MenuProps={{ PaperProps: { sx: menuPaperSx } }}
        >
          {PARAMETERS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </Select>
      </FormControl>

      {/* Operator */}
      <FormControl sx={selectSx(color)} size="small">
        <InputLabel>Op</InputLabel>
        <Select
          value={op}
          label="Op"
          disabled={!enabled}
          onChange={(e) => handleChange("operator", e.target.value)}
          MenuProps={{ PaperProps: { sx: menuPaperSx } }}
        >
          {OPERATORS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </Select>
      </FormControl>

      {/* Value — full width on mobile (spans both cols), normal on sm+ */}
      <TextField
        label="Value"
        size="small"
        disabled={!enabled}
        type={isStrParam ? "text" : "number"}
        value={val}
        onChange={(e) => handleChange("value", e.target.value)}
        error={!isValid}
        helperText={!isValid ? "Required" : ""}
        sx={{ ...textFieldSx(color), gridColumn: { xs: "1 / -1", sm: "auto" } }}
      />

      {/* Remove — hidden on mobile (button below instead) */}
      <Tooltip title="Remove">
        <span>
          <IconButton
            size="small"
            onClick={() => onRemove(index)}
            disabled={!enabled}
            sx={{
              display: { xs: "none", sm: "flex" },
              mt: 0.3, color: "rgba(248,113,113,0.6)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: "6px", width: 32, height: 32,
              "&:hover": { background: "rgba(248,113,113,0.1)", color: "#f87171" },
              "&:disabled": { opacity: 0.25 },
            }}
          >✕</IconButton>
        </span>
      </Tooltip>

      {/* Mobile remove */}
      {total > 0 && (
        <Button size="small" onClick={() => onRemove(index)} disabled={!enabled}
          sx={{
            display: { xs: "flex", sm: "none" },
            gridColumn: "1 / -1", fontSize: 11, color: "#f87171",
            border: "1px solid rgba(248,113,113,0.2)", borderRadius: "6px", py: 0.4,
            "&:hover": { background: "rgba(248,113,113,0.08)" },
          }}>
          Remove condition
        </Button>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────
// RelayCard — uses a counter ref to give each condition a stable unique id
// ─────────────────────────────────────────────────────────────────────
function RelayCard({ meta, relay, onRelayChange, onSave, saving, lastSaved }) {
  // stable id counter so React keys don't recycle DOM nodes when adding/removing
  const idCounterRef = useRef(
    relay.conditions.map((_, i) => i + 1)
  );

  const patch = useCallback(
    (changes) => onRelayChange(meta.key, { ...relay, ...changes }),
    [relay, meta.key, onRelayChange]
  );

  const setCondition = useCallback((idx, updated) => {
    patch({
      conditions: relay.conditions.map((c, i) => (i === idx ? updated : c)),
    });
  }, [relay.conditions, patch]);

  const removeCondition = useCallback((idx) => {
    idCounterRef.current = idCounterRef.current.filter((_, i) => i !== idx);
    patch({ conditions: relay.conditions.filter((_, i) => i !== idx) });
  }, [relay.conditions, patch]);

  const addCondition = useCallback(() => {
    const newId = Math.max(0, ...idCounterRef.current) + 1;
    idCounterRef.current = [...idCounterRef.current, newId];
    patch({ conditions: [...relay.conditions, { ...RELAY_DEFAULTS[meta.key] }] });
  }, [relay.conditions, meta.key, patch]);

  const setSchedule = useCallback((scheduleUpdates) => {
    patch({
      schedule: {
        ...getDefaultSchedule(meta.key),
        ...relay.schedule,
        ...scheduleUpdates,
      },
    });
  }, [meta.key, patch, relay.schedule]);

  const updateFixedTimeEntry = useCallback((idx, field, value) => {
    const currentEntries = Array.isArray(relay.schedule?.entries) ? relay.schedule.entries : [];
    setSchedule({
      type: "fixed_times",
      entries: currentEntries.map((entry, entryIndex) => (
        entryIndex === idx ? { ...entry, [field]: value } : entry
      )),
    });
  }, [relay.schedule?.entries, setSchedule]);

  const addFixedTimeEntry = useCallback(() => {
    const currentEntries = Array.isArray(relay.schedule?.entries) ? relay.schedule.entries : [];
    if (currentEntries.length >= 5) return;

    setSchedule({
      type: "fixed_times",
      entries: [...currentEntries, { ...FIXED_TIME_ENTRY_DEFAULT }],
    });
  }, [relay.schedule?.entries, setSchedule]);

  const removeFixedTimeEntry = useCallback((idx) => {
    const currentEntries = Array.isArray(relay.schedule?.entries) ? relay.schedule.entries : [];
    setSchedule({
      type: "fixed_times",
      entries: currentEntries.filter((_, entryIndex) => entryIndex !== idx),
    });
  }, [relay.schedule?.entries, setSchedule]);

  // Sync ids array length if relay.conditions was reset externally (e.g. fetch/reset)
  if (idCounterRef.current.length !== relay.conditions.length) {
    idCounterRef.current = relay.conditions.map((_, i) => i + 1);
  }

  const conditionsValid = relay.conditions.every((c) => {
    if (c.parameter === "soilStatus") return typeof c.value === "string" && c.value.trim() !== "";
    return c.value !== undefined && c.value !== null && c.value !== "" && !isNaN(Number(c.value));
  });
  const scheduleEnabled = Boolean(relay.schedule?.enabled);
  const scheduleType = relay.schedule?.type === "fixed_times" ? "fixed_times" : "hourly";
  const fixedEntries = Array.isArray(relay.schedule?.entries) ? relay.schedule.entries : [];
  const scheduleValid = !scheduleEnabled || (
    scheduleType === "hourly"
      ? (
          Number.isFinite(Number(relay.schedule?.startMinute)) &&
          Number(relay.schedule.startMinute) >= 0 &&
          Number(relay.schedule.startMinute) <= 59 &&
          Number.isFinite(Number(relay.schedule?.durationMinutes)) &&
          Number(relay.schedule.durationMinutes) > 0
        )
      : (
          fixedEntries.length > 0 &&
          fixedEntries.length <= 5 &&
          fixedEntries.every((entry) => (
            Number.isFinite(Number(entry?.hour)) &&
            Number(entry.hour) >= 0 &&
            Number(entry.hour) <= 23 &&
            Number.isFinite(Number(entry?.minute)) &&
            Number(entry.minute) >= 0 &&
            Number(entry.minute) <= 59 &&
            Number.isFinite(Number(entry?.durationSeconds)) &&
            Number(entry.durationSeconds) > 0
          ))
        )
  );
  const hasAutomationSource = relay.conditions.length > 0 || scheduleEnabled;
  const configValid = conditionsValid && scheduleValid && hasAutomationSource;

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible"
      custom={RELAY_META.findIndex(m => m.key === meta.key)}>
      <Box sx={{
        p: { xs: 2.5, md: 3 }, borderRadius: "16px",
        border: `1px solid ${relay.enabled ? meta.borderColor : "rgba(74,222,128,0.08)"}`,
        background: relay.enabled ? meta.bg : "rgba(8,15,10,0.4)",
        transition: "all 0.3s", display: "flex", flexDirection: "column",
      }}>
        {/* Header row */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: "10px", fontSize: 20,
              background: relay.enabled ? `${meta.color}18` : "rgba(74,222,128,0.05)",
              border: `1px solid ${relay.enabled ? meta.color + "40" : "rgba(74,222,128,0.1)"}`,
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s",
            }}>{meta.icon}</Box>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#e8f5e9", lineHeight: 1.2 }}>{meta.label}</Typography>
              <Typography sx={{ fontSize: 10, color: "rgba(232,245,233,0.35)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>
                RELAY CONTROL
              </Typography>
            </Box>
          </Box>

          {/* Enable toggle */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", transition: "color 0.3s", color: relay.enabled ? meta.color : "rgba(232,245,233,0.3)" }}>
              {relay.enabled ? "ACTIVE" : "OFF"}
            </Typography>
            <Switch
              checked={relay.enabled}
              onChange={(e) => patch({ enabled: e.target.checked })}
              size="small"
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: meta.color },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: meta.color },
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ borderColor: "rgba(74,222,128,0.07)", mb: 2 }} />

        {/* Condition label + AND/OR toggle */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: 10, letterSpacing: 1.5, color: "rgba(232,245,233,0.3)", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
            Trigger Conditions ({relay.conditions.length})
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {LOGIC_OPTIONS.map((opt) => (
              <Button key={opt} size="small"
                onClick={() => patch({ logic: opt })}
                disabled={!relay.enabled}
                sx={{
                  minWidth: 0, px: 1.2, py: 0.2, fontSize: 10, borderRadius: "6px",
                  fontFamily: "'JetBrains Mono',monospace",
                  background: relay.logic === opt ? `${meta.color}22` : "transparent",
                  color:      relay.logic === opt ? meta.color : "rgba(232,245,233,0.35)",
                  border: `1px solid ${relay.logic === opt ? meta.color + "50" : "rgba(74,222,128,0.1)"}`,
                  "&:hover": { background: `${meta.color}15` },
                  "&:disabled": { opacity: 0.4 },
                }}>{opt}</Button>
            ))}
          </Box>
          <Typography sx={{ fontSize: 10, color: "rgba(232,245,233,0.38)", fontFamily: "'JetBrains Mono',monospace" }}>
            Applies between conditions and schedule
          </Typography>
        </Box>

        {/* Condition rows — key uses stable id so React doesn't recycle nodes */}
        <Box sx={{ flex: 1 }}>
          {relay.conditions.map((cond, idx) => (
            <ConditionRow
              key={idCounterRef.current[idx] ?? idx}
              rowId={idCounterRef.current[idx] ?? idx}
              index={idx}
              condition={cond}
              total={relay.conditions.length}
              color={meta.color}
              enabled={relay.enabled}
              relayKey={meta.key}
              onChange={setCondition}
              onRemove={removeCondition}
            />
          ))}
          {relay.conditions.length === 0 && (
            <Box sx={{ mb: 1.5, p: 1.5, borderRadius: "10px", border: `1px dashed ${meta.color}35`, background: `${meta.color}08` }}>
              <Typography sx={{ fontSize: 11, color: "rgba(232,245,233,0.5)" }}>
                No conditions configured. This relay will run from schedule only if schedule is enabled.
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ mb: 2, p: 1.8, borderRadius: "10px", background: `${meta.color}10`, border: `1px solid ${meta.color}26` }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontSize: 10, letterSpacing: 1.5, color: "rgba(232,245,233,0.3)", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
                Schedule
              </Typography>
              <Typography sx={{ fontSize: 11, color: "rgba(232,245,233,0.45)", mt: 0.5 }}>
                {meta.key === "fan"
                  ? "Use hourly windows or fixed times together with the fan logic."
                  : "Use fixed-time runs with per-entry seconds, or leave schedule off and rely on conditions."}
              </Typography>
            </Box>
            <Switch
              checked={scheduleEnabled}
              onChange={(e) => setSchedule({ enabled: e.target.checked })}
              disabled={!relay.enabled}
              size="small"
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: meta.color },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: meta.color },
              }}
            />
          </Box>

          <Box sx={{ display: "grid", gap: 1.2 }}>
            <FormControl sx={selectSx(meta.color)} size="small">
              <InputLabel>Schedule Type</InputLabel>
              <Select
                value={scheduleType}
                label="Schedule Type"
                disabled={!relay.enabled || !scheduleEnabled}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setSchedule(
                    nextType === "hourly"
                      ? { ...FAN_SCHEDULE_DEFAULT, enabled: scheduleEnabled, type: "hourly" }
                      : { ...FIXED_TIMES_SCHEDULE_DEFAULT, enabled: scheduleEnabled, type: "fixed_times", entries: [{ ...FIXED_TIME_ENTRY_DEFAULT }] }
                  );
                }}
                MenuProps={{ PaperProps: { sx: menuPaperSx } }}
              >
                {meta.key === "fan" && <MenuItem value="hourly">hourly</MenuItem>}
                <MenuItem value="fixed_times">fixed_times</MenuItem>
              </Select>
            </FormControl>

            {scheduleType === "hourly" ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.2 }}>
                <TextField
                  label="Start minute"
                  size="small"
                  type="number"
                  value={relay.schedule?.startMinute ?? FAN_SCHEDULE_DEFAULT.startMinute}
                  disabled={!relay.enabled || !scheduleEnabled}
                  onChange={(e) => setSchedule({ startMinute: e.target.value, type: "hourly" })}
                  inputProps={{ min: 0, max: 59 }}
                  error={scheduleEnabled && (Number(relay.schedule?.startMinute) < 0 || Number(relay.schedule?.startMinute) > 59)}
                  helperText="0 to 59 every hour"
                  sx={textFieldSx(meta.color)}
                />
                <TextField
                  label="Run for minutes"
                  size="small"
                  type="number"
                  value={relay.schedule?.durationMinutes ?? FAN_SCHEDULE_DEFAULT.durationMinutes}
                  disabled={!relay.enabled || !scheduleEnabled}
                  onChange={(e) => setSchedule({ durationMinutes: e.target.value, type: "hourly" })}
                  inputProps={{ min: 1 }}
                  error={scheduleEnabled && Number(relay.schedule?.durationMinutes) <= 0}
                  helperText='Type "hourly"'
                  sx={textFieldSx(meta.color)}
                />
              </Box>
            ) : (
              <Box sx={{ display: "grid", gap: 1.2 }}>
                {fixedEntries.map((entry, idx) => (
                  <Box
                    key={`${meta.key}-entry-${idx}`}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr) 44px" },
                      gap: 1,
                      alignItems: "flex-start",
                    }}
                  >
                    <TextField
                      label="Hour"
                      size="small"
                      type="number"
                      value={entry.hour}
                      disabled={!relay.enabled || !scheduleEnabled}
                      onChange={(e) => updateFixedTimeEntry(idx, "hour", e.target.value)}
                      inputProps={{ min: 0, max: 23 }}
                      error={scheduleEnabled && (Number(entry.hour) < 0 || Number(entry.hour) > 23)}
                      helperText="0 to 23"
                      sx={textFieldSx(meta.color)}
                    />
                    <TextField
                      label="Minute"
                      size="small"
                      type="number"
                      value={entry.minute}
                      disabled={!relay.enabled || !scheduleEnabled}
                      onChange={(e) => updateFixedTimeEntry(idx, "minute", e.target.value)}
                      inputProps={{ min: 0, max: 59 }}
                      error={scheduleEnabled && (Number(entry.minute) < 0 || Number(entry.minute) > 59)}
                      helperText="0 to 59"
                      sx={textFieldSx(meta.color)}
                    />
                    <TextField
                      label="Duration seconds"
                      size="small"
                      type="number"
                      value={entry.durationSeconds}
                      disabled={!relay.enabled || !scheduleEnabled}
                      onChange={(e) => updateFixedTimeEntry(idx, "durationSeconds", e.target.value)}
                      inputProps={{ min: 1 }}
                      error={scheduleEnabled && Number(entry.durationSeconds) <= 0}
                      helperText="Seconds"
                      sx={textFieldSx(meta.color)}
                    />
                    <Tooltip title={fixedEntries.length === 1 ? "Keep at least one entry while fixed_times is enabled" : "Remove entry"}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => removeFixedTimeEntry(idx)}
                          disabled={!relay.enabled || !scheduleEnabled || fixedEntries.length === 1}
                          sx={{
                            mt: 0.3,
                            color: "rgba(248,113,113,0.6)",
                            border: "1px solid rgba(248,113,113,0.2)",
                            borderRadius: "6px",
                            width: 36,
                            height: 36,
                            "&:hover": { background: "rgba(248,113,113,0.1)", color: "#f87171" },
                          }}
                        >
                          ×
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                ))}
                <Button
                  size="small"
                  onClick={addFixedTimeEntry}
                  disabled={!relay.enabled || !scheduleEnabled || fixedEntries.length >= 5}
                  sx={{
                    justifySelf: "flex-start",
                    fontSize: 11,
                    borderRadius: "8px",
                    fontFamily: "'JetBrains Mono',monospace",
                    color: meta.color,
                    border: `1px dashed ${meta.color}40`,
                  }}
                >
                  ＋ Add Fixed Time
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {/* Add condition button */}
        <Button
          fullWidth
          size="small"
          onClick={addCondition}
          disabled={!relay.enabled}
          sx={{
            mt: 0.5, mb: 2, fontSize: 11, borderRadius: "8px",
            fontFamily: "'JetBrains Mono',monospace",
            color: relay.enabled ? meta.color : "rgba(232,245,233,0.3)",
            border: `1px dashed ${relay.enabled ? meta.color + "40" : "rgba(74,222,128,0.15)"}`,
            "&:hover": { background: `${meta.color}08`, borderStyle: "solid" },
            "&:disabled": { opacity: 0.35 },
          }}
        >
          ＋ Add Condition
        </Button>

        {/* Live preview */}
        {relay.enabled && configValid && (
          <Box sx={{ mb: 2, px: 1.5, py: 1.2, borderRadius: "8px", background: `${meta.color}0d`, border: `1px solid ${meta.color}25` }}>
            <Typography sx={{ fontSize: 9, color: "rgba(232,245,233,0.35)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, mb: 0.8, textTransform: "uppercase" }}>
              Preview
            </Typography>
            {relay.conditions.length > 0 ? relay.conditions.map((c, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: i < relay.conditions.length - 1 ? 0.5 : 0 }}>
                {i > 0 && (
                  <Box sx={{ px: 0.8, py: 0.1, borderRadius: "4px", background: `${meta.color}20`, mr: 0.5 }}>
                    <Typography sx={{ fontSize: 9, color: meta.color, fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 }}>
                      {relay.logic}
                    </Typography>
                  </Box>
                )}
                <Typography sx={{ fontSize: 11, color: meta.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5 }}>
                  {meta.label} ON if {c.parameter} {c.operator} {c.value}
                </Typography>
              </Box>
            )) : (
              <Typography sx={{ fontSize: 11, color: meta.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5 }}>
                Schedule only mode is active.
              </Typography>
            )}
            {scheduleEnabled && scheduleType === "hourly" && (
              <Typography sx={{ mt: 0.8, fontSize: 11, color: meta.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5 }}>
                Schedule: hourly from minute {relay.schedule.startMinute} for {relay.schedule.durationMinutes} minute(s)
              </Typography>
            )}
            {scheduleEnabled && scheduleType === "fixed_times" && (
              <Box sx={{ mt: 0.8 }}>
                {fixedEntries.map((entry, idx) => (
                  <Typography key={`${meta.key}-preview-${idx}`} sx={{ fontSize: 11, color: meta.color, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.5 }}>
                    Schedule fixed {String(entry.hour).padStart(2, "0")}:{String(entry.minute).padStart(2, "0")} +{entry.durationSeconds}s
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Save button */}
        <Button
          fullWidth
          onClick={onSave}
          disabled={saving || !configValid}
          sx={{
            py: 1.2, fontSize: 12, borderRadius: "8px", fontWeight: 500,
            fontFamily: "'JetBrains Mono', monospace",
            background: saving ? "rgba(74,222,128,0.08)" : `linear-gradient(135deg, ${meta.color}22, ${meta.color}44)`,
            color: meta.color,
            border: `1px solid ${meta.color}40`,
            transition: "all 0.3s",
            "&:hover:not(:disabled)": { background: `${meta.color}28`, boxShadow: `0 4px 16px ${meta.color}20` },
            "&:disabled": { opacity: 0.4 },
          }}
        >
          {saving
            ? <><CircularProgress size={12} sx={{ color: meta.color, mr: 1 }} />Saving…</>
            : lastSaved
            ? `✓ Saved at ${lastSaved}`
            : "Save Configuration"}
        </Button>
      </Box>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────
export default function DeviceConfig({ deviceId: propDeviceId, onBack }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const deviceId  = propDeviceId || user?.deviceId;

  const initialRelays = {
    fan:   makeDefaultRelay("fan"),
    motor: makeDefaultRelay("motor"),
    light: makeDefaultRelay("light"),
  };

  const [relays, setRelays]         = useState(initialRelays);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState({ fan: false, motor: false, light: false });
  const [lastSaved, setLastSaved]   = useState({ fan: null,  motor: null,  light: null  });
  const [fetchError, setFetchError] = useState("");
  const [toast, setToast]           = useState({ open: false, message: "", severity: "success" });

  const showToast = (msg, sev = "success") => setToast({ open: true, message: msg, severity: sev });

  // ── Fetch config from MongoDB ──────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    if (!deviceId) { setLoading(false); return; }
    setLoading(true);
    setFetchError("");
    try {
      const config = await getConfig(deviceId);

      // config.relays may be absent (device not yet configured)
      const rawRelays = config?.relays ?? {};

      const normalised = {
        fan:   normaliseRelay(rawRelays.fan,   "fan"),
        motor: normaliseRelay(rawRelays.motor, "motor"),
        light: normaliseRelay(rawRelays.light, "light"),
      };

      setRelays(normalised);
    } catch (err) {
      console.error("[DeviceConfig] fetch error:", err);
      setFetchError(err.message || "Failed to load configuration — showing defaults");
      // Show defaults so the user can still configure
      setRelays(initialRelays);
    } finally {
      setLoading(false);
    }
  }, [deviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchConfig();
  }, [user, fetchConfig, navigate]);

  // ── Relay change handler ───────────────────────────────────────────
  const handleRelayChange = useCallback((key, updated) => {
    setRelays((prev) => ({ ...prev, [key]: updated }));
  }, []);

  // ── Save a single relay ────────────────────────────────────────────
  const handleSave = useCallback(async (relayKey) => {
    const relay = relays[relayKey];

    const hasInvalidConditions = relay.conditions.some((c) => {
      if (c.parameter === "soilStatus") return typeof c.value !== "string" || c.value.trim() === "";
      return c.value === "" || c.value === undefined || isNaN(Number(c.value));
    });
    const scheduleEnabled = Boolean(relay.schedule?.enabled);
    const scheduleType = relay.schedule?.type === "fixed_times" ? "fixed_times" : "hourly";
    const scheduleInvalid = !scheduleEnabled ? false : (
      scheduleType === "hourly"
        ? (
            !Number.isFinite(Number(relay.schedule?.startMinute)) ||
            Number(relay.schedule.startMinute) < 0 ||
            Number(relay.schedule.startMinute) > 59 ||
            !Number.isFinite(Number(relay.schedule?.durationMinutes)) ||
            Number(relay.schedule.durationMinutes) <= 0
          )
        : (
            !Array.isArray(relay.schedule?.entries) ||
            relay.schedule.entries.length === 0 ||
            relay.schedule.entries.length > 5 ||
            relay.schedule.entries.some((entry) => (
              !Number.isFinite(Number(entry?.hour)) ||
              Number(entry.hour) < 0 ||
              Number(entry.hour) > 23 ||
              !Number.isFinite(Number(entry?.minute)) ||
              Number(entry.minute) < 0 ||
              Number(entry.minute) > 59 ||
              !Number.isFinite(Number(entry?.durationSeconds)) ||
              Number(entry.durationSeconds) <= 0
            ))
          )
    );

    if (hasInvalidConditions || scheduleInvalid || (relay.conditions.length === 0 && !scheduleEnabled)) {
      showToast("Add at least one valid condition or enable a valid schedule before saving", "error");
      return;
    }

    const buildRelay = (r) => ({
      enabled:    r.enabled,
      logic:      r.logic || "AND",
      conditions: r.conditions.map((c) => ({
        parameter: c.parameter,
        operator:  c.operator,
        value:     c.parameter === "soilStatus" ? String(c.value) : Number(c.value),
      })),
      ...(r.schedule ? {
        schedule: r.schedule.type === "fixed_times"
          ? {
              enabled: Boolean(r.schedule.enabled),
              type: "fixed_times",
              entries: (Array.isArray(r.schedule.entries) ? r.schedule.entries : []).slice(0, 5).map((entry) => ({
                hour: Number(entry.hour),
                minute: Number(entry.minute),
                durationSeconds: Number(entry.durationSeconds),
              })),
            }
          : {
              enabled: Boolean(r.schedule.enabled),
              type: "hourly",
              startMinute: Number(r.schedule.startMinute ?? FAN_SCHEDULE_DEFAULT.startMinute),
              durationMinutes: Number(r.schedule.durationMinutes ?? FAN_SCHEDULE_DEFAULT.durationMinutes),
            },
      } : {}),
    });

    // Send ALL relays so the saved document is always complete
    const payload = {
      fan:   buildRelay(relays.fan),
      motor: buildRelay(relays.motor),
      light: buildRelay(relays.light),
    };

    setSaving((p) => ({ ...p, [relayKey]: true }));
    try {
      await saveConfig(deviceId, payload);
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastSaved((p) => ({ ...p, [relayKey]: time }));
      showToast(`${relayKey.charAt(0).toUpperCase() + relayKey.slice(1)} saved!`);
    } catch (err) {
      showToast(err.message || "Failed to save", "error");
    } finally {
      setSaving((p) => ({ ...p, [relayKey]: false }));
    }
  }, [relays, deviceId]);

  const handleSaveAll = async () => {
    for (const key of ["fan", "motor", "light"]) await handleSave(key);
  };

  const handleReset = () => {
    setRelays(initialRelays);
    setLastSaved({ fan: null, motor: null, light: null });
    showToast("Reset to defaults — click Save to apply", "info");
  };

  if (!user) return null;

  return (
    <Box sx={{ minHeight: "100%", color: "#e8f5e9", pb: 6 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Cormorant+Garamond:wght@300;600&display=swap');`}</style>

      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        {onBack && (
          <Box component="span" onClick={onBack}
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mb: 2, fontSize: 12, color: "rgba(232,245,233,0.35)", cursor: "pointer", "&:hover": { color: "#4ade80" }, transition: "color 0.2s" }}>
            ← Back to Dashboard
          </Box>
        )}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography sx={{ fontFamily: "'Cormorant Garamond', serif", fontSize: { xs: "1.6rem", md: "2rem" }, fontWeight: 300, color: "#e8f5e9", lineHeight: 1.1 }}>
              Device Configuration
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
              <Typography sx={{ fontSize: 12, color: "#4ade80", fontFamily: "'JetBrains Mono',monospace" }}>
                📡 {deviceId || "No device"}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(232,245,233,0.2)" }}>·</Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(232,245,233,0.38)", fontFamily: "'JetBrains Mono',monospace" }}>
                Multi-condition relay control
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            {/* <Button onClick={handleReset} size="small"
              sx={{ fontSize: 11, color: "rgba(232,245,233,0.4)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: "8px", px: 2, py: 0.8, fontFamily: "'JetBrains Mono',monospace", "&:hover": { background: "rgba(74,222,128,0.05)", color: "#e8f5e9" } }}>
              ↺ Reset defaults
            </Button> */}
            <Button onClick={handleSaveAll} size="small"
              sx={{ fontSize: 11, color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "8px", px: 2, py: 0.8, fontFamily: "'JetBrains Mono',monospace", background: "rgba(74,222,128,0.06)", "&:hover": { background: "rgba(74,222,128,0.12)" } }}>
              ✓ Save All
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Error banner */}
      {fetchError && (
        <Box sx={{ mb: 3, p: 2.5, borderRadius: "10px", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)" }}>
          <Typography sx={{ fontSize: 13, color: "#f87171" }}>⚠ {fetchError}</Typography>
          <Button size="small" onClick={fetchConfig}
            sx={{ mt: 1, fontSize: 11, color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "6px", px: 1.5 }}>
            Retry
          </Button>
        </Box>
      )}

      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 12, flexDirection: "column", gap: 2 }}>
          <CircularProgress sx={{ color: "#4ade80" }} size={32} />
          <Typography sx={{ fontSize: 12, color: "rgba(232,245,233,0.4)", fontFamily: "'JetBrains Mono',monospace" }}>
            Loading configuration from MongoDB…
          </Typography>
        </Box>
      ) : (
        <>
          {/* Info banner */}
          <Box sx={{ mb: 3.5, p: 2.5, borderRadius: "12px", background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.1)" }}>
            <Typography sx={{ fontSize: 12, color: "rgba(232,245,233,0.5)", fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.9 }}>
              ℹ️  Configure when each relay turns ON based on sensor readings. Add multiple conditions and combine them with AND / OR logic. Settings are loaded from MongoDB on every page open.
            </Typography>
          </Box>

          {/* Relay cards */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2.5, mb: 4 }}>
            {RELAY_META.map((meta) => (
              <RelayCard
                key={meta.key}
                meta={meta}
                relay={relays[meta.key]}
                onRelayChange={handleRelayChange}
                onSave={() => handleSave(meta.key)}
                saving={saving[meta.key]}
                lastSaved={lastSaved[meta.key]}
              />
            ))}
          </Box>

          {/* Summary table */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            <Box sx={{ borderRadius: "14px", border: "1px solid rgba(74,222,128,0.1)", background: "rgba(8,15,10,0.6)", overflow: "hidden" }}>
              <Box sx={{ px: 3, py: 2, borderBottom: "1px solid rgba(74,222,128,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#e8f5e9" }}>Configuration Summary</Typography>
                  <Typography sx={{ fontSize: 11, color: "rgba(232,245,233,0.3)", fontFamily: "'JetBrains Mono',monospace" }}>
                    Live view of current relay logic for {deviceId}
                  </Typography>
                </Box>
                <Button onClick={fetchConfig} size="small"
                  sx={{ fontSize: 11, color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "8px", px: 1.5, py: 0.6, fontFamily: "'JetBrains Mono',monospace", "&:hover": { background: "rgba(74,222,128,0.06)" } }}>
                  ↻ Reload from DB
                </Button>
              </Box>
              <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                  <Box component="thead">
                    <Box component="tr" sx={{ "& th": { px: { xs: 2, md: 3 }, py: 1.5, textAlign: "left", fontSize: 10, letterSpacing: 1.5, color: "rgba(232,245,233,0.3)", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace", fontWeight: 400, borderBottom: "1px solid rgba(74,222,128,0.07)", whiteSpace: "nowrap" } }}>
                      <th>Relay</th><th>Status</th><th>Logic</th><th>Conditions</th>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {RELAY_META.map((meta) => {
                      const r = relays[meta.key];
                      return (
                        <Box component="tr" key={meta.key}
                          sx={{ "& td": { px: { xs: 2, md: 3 }, py: 1.8, fontSize: 12, color: "rgba(232,245,233,0.6)", borderBottom: "1px solid rgba(74,222,128,0.05)", fontFamily: "'JetBrains Mono',monospace", verticalAlign: "top" } }}>
                          <Box component="td" sx={{ color: `${meta.color} !important`, fontWeight: 500 }}>
                            {meta.icon} {meta.label}
                          </Box>
                          <Box component="td">
                            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6, px: 1.2, py: 0.3, borderRadius: "20px", background: r.enabled ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${r.enabled ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}` }}>
                              <Box sx={{ width: 5, height: 5, borderRadius: "50%", background: r.enabled ? "#4ade80" : "#f87171" }} />
                              <Typography sx={{ fontSize: 10, color: r.enabled ? "#4ade80" : "#f87171", fontFamily: "'JetBrains Mono',monospace" }}>
                                {r.enabled ? "ON" : "OFF"}
                              </Typography>
                            </Box>
                          </Box>
                          <Box component="td">
                            <Box sx={{ px: 1, py: 0.2, borderRadius: "4px", display: "inline-block", background: `${meta.color}15`, color: meta.color, fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
                              {(r.conditions?.length > 1 || r.schedule?.enabled) ? (r.logic || "AND") : "—"}
                            </Box>
                          </Box>
                          <Box component="td">
                            {r.conditions?.length ? r.conditions.map((c, i) => (
                              <Typography key={i} sx={{ fontSize: "11px !important", color: "rgba(232,245,233,0.5) !important", lineHeight: 1.9 }}>
                                {c.parameter} {c.operator} {c.value}
                              </Typography>
                            )) : (
                              <Typography sx={{ fontSize: "11px !important", color: "rgba(232,245,233,0.38) !important", lineHeight: 1.9 }}>
                                schedule only
                              </Typography>
                            )}
                            {r.schedule?.enabled && r.schedule?.type === "hourly" && (
                              <Typography sx={{ fontSize: "11px !important", color: `${meta.color} !important`, lineHeight: 1.9 }}>
                                hourly @ minute {r.schedule.startMinute} for {r.schedule.durationMinutes}m
                              </Typography>
                            )}
                            {r.schedule?.enabled && r.schedule?.type === "fixed_times" && r.schedule.entries?.map((entry, idx) => (
                              <Typography key={`${meta.key}-summary-${idx}`} sx={{ fontSize: "11px !important", color: `${meta.color} !important`, lineHeight: 1.9 }}>
                                {String(entry.hour).padStart(2, "0")}:{String(entry.minute).padStart(2, "0")} for {entry.durationSeconds}s
                              </Typography>
                            ))}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            </Box>
          </motion.div>
        </>
      )}

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{
            borderRadius: "10px",
            background:   toast.severity === "success" ? "rgba(74,222,128,0.12)" : toast.severity === "error" ? "rgba(248,113,113,0.12)" : "rgba(56,189,248,0.12)",
            color:        toast.severity === "success" ? "#4ade80"               : toast.severity === "error" ? "#f87171"               : "#38bdf8",
            border: `1px solid ${toast.severity === "success" ? "rgba(74,222,128,0.3)" : toast.severity === "error" ? "rgba(248,113,113,0.3)" : "rgba(56,189,248,0.3)"}`,
            "& .MuiAlert-icon": { color: "inherit" },
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
