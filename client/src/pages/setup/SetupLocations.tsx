import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import { Location, LocationContact, LocationInterfaceContact } from "../../types";

export function SetupLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  function reload() {
    api.get<Location[]>("/locations").then(setLocations);
  }

  useEffect(reload, []);

  async function deactivate(id: string) {
    const result = await api.post<{ warning: string | null }>(`/locations/${id}/deactivate`);
    if (result.warning) alert(result.warning);
    reload();
  }

  async function reactivate(id: string) {
    await api.post(`/locations/${id}/reactivate`);
    reload();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Locations</h3>
        <button className="btn" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "+ Add location"}
        </button>
      </div>
      {showAdd && <LocationForm onSaved={() => { setShowAdd(false); reload(); }} />}

      {locations.map((loc) => (
        <div key={loc.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{loc.hotelName}</strong> ({loc.shortCode}) &middot; Mandant {loc.mandantNr}
              {!loc.isActive && <span className="status-pill not_required" style={{ marginLeft: "0.5rem" }}>inactive</span>}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn secondary" onClick={() => setExpandedId(expandedId === loc.id ? null : loc.id)}>
                {expandedId === loc.id ? "Collapse" : "Manage"}
              </button>
              {loc.isActive ? (
                <button className="btn danger" onClick={() => deactivate(loc.id)}>
                  Deactivate
                </button>
              ) : (
                <button className="btn secondary" onClick={() => reactivate(loc.id)}>
                  Reactivate
                </button>
              )}
            </div>
          </div>
          {expandedId === loc.id && <LocationDetails location={loc} onChanged={reload} />}
        </div>
      ))}
    </div>
  );
}

function LocationForm({
  initial,
  onSaved,
}: {
  initial?: Location;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    mandantNr: initial?.mandantNr ?? "",
    shortCode: initial?.shortCode ?? "",
    hotelName: initial?.hotelName ?? "",
    address: initial?.address ?? "",
    plzOrt: initial?.plzOrt ?? "",
    phone: initial?.phone ?? "",
    fax: initial?.fax ?? "",
    generalEmail: initial?.generalEmail ?? "",
    roomCount: initial?.roomCount?.toString() ?? "",
    legalEntity: initial?.legalEntity ?? "",
    vatId: initial?.vatId ?? "",
    taxNumber: initial?.taxNumber ?? "",
    billingAddressBlock: initial?.billingAddressBlock ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { ...form, roomCount: form.roomCount ? Number(form.roomCount) : null };
      if (initial) {
        await api.patch(`/locations/${initial.id}`, payload);
      } else {
        await api.post("/locations", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save location");
    }
  }

  function field(key: keyof typeof form, label: string) {
    return (
      <div className="form-field">
        <label>{label}</label>
        <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="form-grid">
        {field("mandantNr", "Mandant Nr.")}
        {field("shortCode", "Short code")}
        {field("hotelName", "Hotel name")}
        {field("address", "Address")}
        {field("plzOrt", "PLZ / Ort")}
        {field("phone", "Phone")}
        {field("fax", "Fax")}
        {field("generalEmail", "General email")}
        {field("roomCount", "Room count")}
        {field("legalEntity", "Legal entity")}
        {field("vatId", "VAT ID")}
        {field("taxNumber", "Tax number")}
      </div>
      <div className="form-field" style={{ marginTop: "0.85rem" }}>
        <label>Billing address block</label>
        <textarea
          rows={2}
          value={form.billingAddressBlock}
          onChange={(e) => setForm({ ...form, billingAddressBlock: e.target.value })}
        />
      </div>
      {error && <div className="error-text" style={{ marginTop: "0.5rem" }}>{error}</div>}
      <button className="btn" type="submit" style={{ marginTop: "0.85rem" }}>
        Save
      </button>
    </form>
  );
}

function LocationDetails({ location, onChanged }: { location: Location; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);

  return (
    <div style={{ marginTop: "1rem", borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
      <button className="btn secondary" onClick={() => setEditing((v) => !v)} style={{ marginBottom: "0.85rem" }}>
        {editing ? "Cancel edit" : "Edit core data"}
      </button>
      {editing && <LocationForm initial={location} onSaved={() => { setEditing(false); onChanged(); }} />}

      <ContactsManager location={location} onChanged={onChanged} />
      <InterfaceContactsManager location={location} onChanged={onChanged} />
    </div>
  );
}

function ContactsManager({ location, onChanged }: { location: Location; onChanged: () => void }) {
  const [role, setRole] = useState("GM");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    await api.post(`/locations/${location.id}/contacts`, {
      role,
      name,
      phone: phone || null,
      email: email || null,
      note: note || null,
    });
    setName("");
    setPhone("");
    setEmail("");
    setNote("");
    onChanged();
  }

  async function remove(contactId: string) {
    await api.delete(`/locations/${location.id}/contacts/${contactId}`);
    onChanged();
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <h4>Contacts (GM / OM)</h4>
      <ul>
        {location.contacts.map((c: LocationContact) => (
          <li key={c.id}>
            <strong>{c.role}</strong>: {c.name} {c.phone && `· ${c.phone}`} {c.email && `(${c.email})`}{" "}
            {c.note && <em> — {c.note}</em>}{" "}
            <button className="btn secondary" onClick={() => remove(c.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        <input placeholder="Role (GM/OM)" value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 90 }} />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn" type="submit">
          Add
        </button>
      </form>
    </div>
  );
}

function InterfaceContactsManager({ location, onChanged }: { location: Location; onChanged: () => void }) {
  const [type, setType] = useState("IT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    await api.post(`/locations/${location.id}/interface-contacts`, {
      type,
      name: name || null,
      email: email || null,
      phone: phone || null,
    });
    setName("");
    setEmail("");
    setPhone("");
    onChanged();
  }

  async function remove(contactId: string) {
    await api.delete(`/locations/${location.id}/interface-contacts/${contactId}`);
    onChanged();
  }

  return (
    <div>
      <h4>Interface contacts (IT / Payroll / KEOS / AMS / Facility / ...)</h4>
      <ul>
        {location.interfaceContacts.map((c: LocationInterfaceContact) => (
          <li key={c.id}>
            <strong>{c.type}</strong>: {c.name ?? "-"} {c.email && `(${c.email})`} {c.phone && `· ${c.phone}`}{" "}
            <button className="btn secondary" onClick={() => remove(c.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        <input placeholder="Type (IT/Payroll/KEOS/AMS/...)" value={type} onChange={(e) => setType(e.target.value)} style={{ width: 190 }} required />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="btn" type="submit">
          Add
        </button>
      </form>
    </div>
  );
}
