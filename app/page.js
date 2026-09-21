"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FALLBACK_PATROLS = [
  { name: "H Falco", leader_name: "Filip" },
  { name: "H Świetliki", leader_name: "Lilianna" },
  { name: "HS Męski", leader_name: "Karol" },
  { name: "HS Damski", leader_name: "Basia" },
  { name: "Wędrownicy", leader_name: "Tymon" },
];

const MAIN_LOCATIONS = ["Nora", "Basecamp"];

const PARENT_EVENTS = [
  {
    id: 1,
    date: "2026-09-26",
    title: "Zbiórka H Falco",
    time: "17:30–19:30",
    location: "Basecamp",
    type: "Zbiórka",
    info: "Orientacja w terenie",
    bring: "Mundur, latarka, coś do picia",
  },
  {
    id: 2,
    date: "2026-10-24",
    title: "INO Dąbrówka",
    time: "07:15–18:00",
    location: "Dąbrówka",
    type: "Wyjazd",
    info: "Mistrzostwa Chorągwi w biegu na orientację",
    bring: "Mundur, buty terenowe, prowiant, woda",
    cost: "35 zł",
    deadline: "15 października",
  },
];

function createTimes() {
  const result = [];

  for (let hour = 7; hour <= 21; hour++) {
    result.push(`${String(hour).padStart(2, "0")}:00`);
    result.push(`${String(hour).padStart(2, "0")}:30`);
  }

  return result;
}

const TIMES = createTimes();

function addMinutes(time, minutes) {
  const [hours, mins] = time.slice(0, 5).split(":").map(Number);
  const total = hours * 60 + mins + minutes;

  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`;
}

function normalizeTime(time) {
  return String(time || "").slice(0, 5);
}

function dateToString(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function moveDate(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateToString(date);
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;

  const days = [];

  for (let i = 0; i < startOffset; i++) days.push(null);

  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) days.push(null);

  return days;
}

function availableTimesForDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const weekend = date.getDay() === 0 || date.getDay() === 6;

  return TIMES.filter((time) => {
    const hour = Number(time.slice(0, 2));

    if (weekend) return hour >= 7 && hour < 22;
    return hour >= 12 && hour < 22;
  });
}

function halfHourStarts(start, end) {
  const result = [];
  let current = start;

  while (current < end) {
    result.push(current);
    current = addMinutes(current, 30);
  }

  return result;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isAdminRole(role) {
  return ["admin", "administrator"].includes(normalizeRole(role));
}

function eventTypeLabel(type) {
  const labels = {
    "zbiórka": "Zbiórka",
    "wydarzenie": "Wydarzenie",
    "służba": "Służba",
    "wyjazd": "Wyjazd",
    "biwak": "Biwak",
    "rajd": "Rajd",
    "zawody": "Zawody",
    "inne": "Inne",
  };

  return labels[type] || "Wydarzenie";
}

function isTripType(type) {
  return ["wyjazd", "biwak", "rajd", "zawody"].includes(type);
}

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${dateString}T12:00:00`);
  target.setHours(0, 0, 0, 0);

  return Math.round((target - today) / 86400000);
}

function tripCountdownLabel(dateString) {
  const days = daysUntil(dateString);

  if (days < 0) return "zakończone";
  if (days === 0) return "dzisiaj";
  if (days === 1) return "jutro";
  if (days < 7) return `za ${days} dni`;
  if (days < 14) return "za tydzień";
  return `za ${days} dni`;
}

function taskDeadlineLabel(dateString) {
  if (!dateString) return "bez terminu";

  const days = daysUntil(dateString);

  if (days < 0) return `${Math.abs(days)} dni po terminie`;
  if (days === 0) return "termin dzisiaj";
  if (days === 1) return "termin jutro";
  if (days <= 7) return `termin za ${days} dni`;
  return `do ${dateString}`;
}

const cardStyle = {
  background: "white",
  borderRadius: 18,
  padding: 17,
  boxShadow: "0 4px 18px rgba(0,0,0,.055)",
};

const primaryStyle = {
  border: 0,
  background: "#8b2635",
  color: "white",
  borderRadius: 13,
  padding: "11px 15px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryStyle = {
  border: "1px solid #d6dbd6",
  background: "white",
  color: "#1c382b",
  borderRadius: 13,
  padding: "10px 14px",
  cursor: "pointer",
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 7,
  padding: "13px 12px",
  borderRadius: 12,
  border: "1px solid #d2d7d2",
  background: "white",
  fontSize: 15,
  color: "#17231c",
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState("Grafik");

  const [selectedDate, setSelectedDate] = useState("2026-09-26");
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(8);

  const [locationFilter, setLocationFilter] = useState("Wszystkie");

  const [patrols, setPatrols] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [events, setEvents] = useState([]);
  const [myPatrolIds, setMyPatrolIds] = useState([]);

  const [tasks, setTasks] = useState([]);

  const [people, setPeople] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [moreSection, setMoreSection] = useState("menu");

  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    body: "",
    audience: "whole",
    patrolId: "",
    important: false,
    pinned: false,
    expiresAt: "",
  });

  const [userEditor, setUserEditor] = useState(null);
  const [userSaving, setUserSaving] = useState(false);

  const [signupMode, setSignupMode] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupMessage, setSignupMessage] = useState("");

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    audience: "whole",
    patrolId: "",
  });

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventDetails, setEventDetails] = useState(null);

  const [eventForm, setEventForm] = useState({
    title: "",
    eventType: "zbiórka",
    audience: "whole",
    patrolId: "",
    date: "2026-09-28",
    startTime: "17:30",
    endTime: "19:30",
    location: "Basecamp",
    customLocation: "",
    description: "",
    bring: "",
    hasPayment: false,
    cost: "",
    paymentDeadline: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    reserver: "",
    location: "Nora",
    customLocation: "",
    startTime: "17:30",
    endTime: "19:30",
  });

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        await loadRole(newSession.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && role && role !== "parent") {
      loadSchedule();
      loadEvents();
      loadTasks();
      loadPeople();
      loadAnnouncements();
    }
  }, [session, role]);

  async function checkSession() {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    setSession(currentSession);

    if (currentSession?.user) {
      await loadRole(currentSession.user.id);
    } else {
      setLoading(false);
    }
  }

  async function loadRole(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Błąd profilu:", error);
      setRole("member");
    } else {
      setRole(normalizeRole(data?.role || "member"));
    }

    setLoading(false);
  }

  async function verifyAdminAccess() {
    if (!session?.user?.id) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Nie udało się potwierdzić roli admina:", error);
      return normalizeRole(role) === "admin";
    }

    const admin = isAdminRole(data?.role);

    if (admin && !isAdminRole(role)) {
      setRole("admin");
    }

    return admin;
  }

  async function loadSchedule() {
    setScheduleLoading(true);

    try {
      const [
        { data: patrolData, error: patrolError },
        { data: slotData, error: slotError },
        { data: reservationData, error: reservationError },
        { data: scheduleEventData, error: scheduleEventError },
      ] = await Promise.all([
        supabase.from("patrols").select("id, name, leader_name, leader_id").order("id"),
        supabase
          .from("schedule_slots")
          .select("id, slot_date, start_time, end_time, location, notes, created_by, event_id")
          .order("slot_date")
          .order("start_time"),
        supabase
          .from("schedule_reservations")
          .select("id, slot_id, patrol_id, reserved_by, created_at, reservation_name, reservation_group"),
        supabase
          .from("events")
          .select("id,title,event_date,start_time,end_time,location,created_by"),
      ]);

      if (patrolError) throw patrolError;
      if (slotError) throw slotError;
      if (reservationError) throw reservationError;
      if (scheduleEventError) throw scheduleEventError;

      const loadedPatrols = patrolData?.length > 0 ? patrolData : FALLBACK_PATROLS;
      setPatrols(loadedPatrols);

      const rawManual = (reservationData || []).map((reservation) => {
        const slot = (slotData || []).find((item) => Number(item.id) === Number(reservation.slot_id));
        const patrol = (patrolData || []).find((item) => Number(item.id) === Number(reservation.patrol_id));
        if (!slot) return null;
        return {
          id: reservation.id,
          slotId: slot.id,
          patrolId: reservation.patrol_id,
          reservedBy: reservation.reserved_by,
          reservationGroup: reservation.reservation_group,
          date: slot.slot_date,
          time: normalizeTime(slot.start_time),
          endTime: normalizeTime(slot.end_time),
          location: slot.location,
          notes: slot.notes,
          patrol: reservation.reservation_name || patrol?.name || "Zastęp",
          leader: reservation.reservation_name === "Cała drużyna" ? "rezerwacja drużyny" : patrol?.leader_name || "",
          isEvent: false,
        };
      }).filter(Boolean);

      const groupedManual = [];
      const groups = new Map();
      for (const item of rawManual) {
        const key = item.reservationGroup ? `group-${item.reservationGroup}` : `single-${item.id}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      }
      for (const items of groups.values()) {
        items.sort((a, b) => a.time.localeCompare(b.time));
        const first = items[0];
        const last = items[items.length - 1];
        groupedManual.push({
          ...first,
          id: first.reservationGroup ? `group-${first.reservationGroup}` : first.id,
          reservationIds: items.map((x) => x.id),
          slotIds: items.map((x) => x.slotId),
          endTime: last.endTime,
        });
      }

      const eventGroups = new Map();
      for (const slot of (slotData || []).filter((item) => item.event_id)) {
        const key = String(slot.event_id);
        if (!eventGroups.has(key)) eventGroups.set(key, []);
        eventGroups.get(key).push(slot);
      }
      const eventBlocks = [];
      for (const [eventId, slots] of eventGroups.entries()) {
        slots.sort((a, b) => normalizeTime(a.start_time).localeCompare(normalizeTime(b.start_time)));
        const first = slots[0];
        const last = slots[slots.length - 1];
        eventBlocks.push({
          id: `event-${eventId}`,
          eventId: Number(eventId),
          reservedBy: first.created_by,
          date: first.slot_date,
          time: normalizeTime(first.start_time),
          endTime: normalizeTime(last.end_time),
          location: first.location,
          notes: first.notes,
          patrol: first.notes || "Wydarzenie",
          leader: "wydarzenie drużyny",
          isEvent: true,
        });
      }

      const linkedEventIds = new Set(eventBlocks.map((item) => Number(item.eventId)));
      const legacyEventBlocks = (scheduleEventData || [])
        .filter((eventItem) => MAIN_LOCATIONS.includes(eventItem.location))
        .filter((eventItem) => !linkedEventIds.has(Number(eventItem.id)))
        .map((eventItem) => ({
          id: `event-${eventItem.id}`,
          eventId: Number(eventItem.id),
          reservedBy: eventItem.created_by,
          date: eventItem.event_date,
          time: normalizeTime(eventItem.start_time),
          endTime: normalizeTime(eventItem.end_time) || addMinutes(normalizeTime(eventItem.start_time), 30),
          location: eventItem.location,
          notes: eventItem.title,
          patrol: eventItem.title || "Wydarzenie",
          leader: "wydarzenie drużyny",
          isEvent: true,
        }));

      setReservations([...groupedManual, ...eventBlocks, ...legacyEventBlocks]);
    } catch (error) {
      console.error("Błąd pobierania grafiku:", error);
      alert("Nie udało się pobrać Grafiku z bazy. Jeśli błąd się powtórzy, podeślij mi ekran.");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function loadEvents() {
    if (!session?.user) return;

    try {
      const [
        { data: eventData, error: eventError },
        { data: membershipData },
      ] = await Promise.all([
        supabase
          .from("events")
          .select(
            "id,title,event_type,event_date,start_time,end_time,location,description,created_by,whole_troop,patrol_id,what_to_bring,cost,payment_deadline"
          )
          .order("event_date")
          .order("start_time"),

        supabase
          .from("patrol_members")
          .select("patrol_id")
          .eq("user_id", session.user.id),
      ]);

      if (eventError) throw eventError;

      setEvents(eventData || []);
      setMyPatrolIds(
        (membershipData || []).map((item) => Number(item.patrol_id))
      );
    } catch (error) {
      console.error("Błąd pobierania wydarzeń:", error);
      alert("Nie udało się pobrać wydarzeń.");
    }
  }

  function openEventForm(presetType = "zbiórka") {
    const tripPreset = isTripType(presetType);

    setEventForm({
      title: "",
      eventType: presetType,
      audience: "whole",
      patrolId: patrols[0]?.id ? String(patrols[0].id) : "",
      date: selectedDate,
      startTime: tripPreset ? "08:00" : "17:30",
      endTime: tripPreset ? "18:00" : "19:30",
      location: tripPreset ? "Inne" : "Basecamp",
      customLocation: "",
      description: "",
      bring: "",
      hasPayment: false,
      cost: "",
      paymentDeadline: "",
    });

    setEventModalOpen(true);
  }

  async function saveEvent() {
    if (!session?.user || !isAdmin) {
      alert("Tylko administrator może dodawać wydarzenia.");
      return;
    }

    const finalLocation =
      eventForm.location === "Inne"
        ? eventForm.customLocation.trim()
        : eventForm.location;

    if (!eventForm.title.trim()) {
      alert("Wpisz nazwę wydarzenia.");
      return;
    }

    if (!eventForm.date || !eventForm.startTime) {
      alert("Uzupełnij datę i godzinę.");
      return;
    }

    if (eventForm.endTime && eventForm.endTime <= eventForm.startTime) {
      alert("Godzina zakończenia musi być późniejsza niż rozpoczęcia.");
      return;
    }

    if (!finalLocation) {
      alert("Wpisz miejsce wydarzenia.");
      return;
    }

    if (eventForm.audience === "patrol" && !eventForm.patrolId) {
      alert("Wybierz zastęp.");
      return;
    }

    if (eventForm.hasPayment && !eventForm.cost.trim()) {
      alert("Wpisz kwotę płatności.");
      return;
    }

    setEventSaving(true);
    let createdEventId = null;

    try {
      const reservesRoom = MAIN_LOCATIONS.includes(finalLocation);

      const starts = reservesRoom
        ? halfHourStarts(
            eventForm.startTime,
            eventForm.endTime || addMinutes(eventForm.startTime, 30)
          )
        : [];

      if (reservesRoom) {
        const { data: existingSlots, error: existingError } = await supabase
          .from("schedule_slots")
          .select("id,start_time,location")
          .eq("slot_date", eventForm.date)
          .eq("location", finalLocation);

        if (existingError) throw existingError;

        const occupiedTimes = new Set(
          (existingSlots || []).map((slot) => normalizeTime(slot.start_time))
        );

        const conflict = starts.find((time) => occupiedTimes.has(time));

        if (conflict) {
          alert(
            `${finalLocation} jest już zajęty ${eventForm.date} o ${conflict}. Wydarzenie nie zostało zapisane.`
          );
          return;
        }
      }

      const { data: created, error: eventError } = await supabase
        .from("events")
        .insert({
          title: eventForm.title.trim(),
          event_type: eventForm.eventType,
          event_date: eventForm.date,
          start_time: `${eventForm.startTime}:00`,
          end_time: eventForm.endTime
            ? `${eventForm.endTime}:00`
            : null,
          location: finalLocation,
          description: eventForm.description.trim() || null,
          created_by: session.user.id,
          whole_troop: eventForm.audience === "whole",
          patrol_id:
            eventForm.audience === "patrol"
              ? Number(eventForm.patrolId)
              : null,
          what_to_bring: eventForm.bring.trim() || null,
          cost: eventForm.hasPayment
            ? eventForm.cost.trim()
            : null,
          payment_deadline:
            eventForm.hasPayment && eventForm.paymentDeadline
              ? eventForm.paymentDeadline
              : null,
        })
        .select("id")
        .single();

      if (eventError) throw eventError;

      createdEventId = created.id;

      if (reservesRoom && starts.length > 0) {
        const slotsToInsert = starts.map((time) => ({
          slot_date: eventForm.date,
          start_time: `${time}:00`,
          end_time: `${addMinutes(time, 30)}:00`,
          location: finalLocation,
          notes: eventForm.title.trim(),
          created_by: session.user.id,
          event_id: created.id,
        }));

        const { error: slotError } = await supabase
          .from("schedule_slots")
          .insert(slotsToInsert);

        if (slotError) throw slotError;
      }

      setEventModalOpen(false);

      await Promise.all([loadEvents(), loadSchedule()]);
    } catch (error) {
      console.error("Błąd zapisu wydarzenia:", error);

      if (createdEventId) {
        await supabase
          .from("events")
          .delete()
          .eq("id", createdEventId);
      }

      alert(
        `Nie udało się zapisać wydarzenia.\n\n${error?.message || ""}`
      );
    } finally {
      setEventSaving(false);
    }
  }

  async function deleteEvent(eventItem) {
    if (!isAdmin || !eventItem?.id) return;

    const confirmed = window.confirm(
      `Usunąć wydarzenie „${eventItem.title}”?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventItem.id);

    if (error) {
      alert(`Nie udało się usunąć wydarzenia.\n\n${error.message}`);
      return;
    }

    setEventDetails(null);

    await Promise.all([loadEvents(), loadSchedule()]);
  }

  async function loadPeople() {
    if (!session?.user) return;

    const [
      { data: profileData, error: profileError },
      { data: membershipData, error: membershipError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,role,full_name,function_title,is_staff,created_at")
        .order("full_name"),
      supabase
        .from("patrol_members")
        .select("user_id,patrol_id"),
    ]);

    if (profileError) {
      console.error("Błąd pobierania profili:", profileError);
      return;
    }

    if (membershipError) {
      console.error("Błąd pobierania członkostw:", membershipError);
    }

    setPeople(profileData || []);
    setMemberships(membershipData || []);
  }

  async function loadAnnouncements() {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("announcements")
      .select(
        "id,title,body,whole_troop,patrol_id,important,pinned,expires_at,created_by,created_at"
      )
      .order("pinned", { ascending: false })
      .order("important", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Błąd pobierania ogłoszeń:", error);
      return;
    }

    setAnnouncements(data || []);
  }

  function openAnnouncementForm() {
    setAnnouncementForm({
      title: "",
      body: "",
      audience: "whole",
      patrolId: patrols[0]?.id ? String(patrols[0].id) : "",
      important: false,
      pinned: false,
      expiresAt: "",
    });

    setAnnouncementModalOpen(true);
  }

  async function saveAnnouncement() {
    const admin = await verifyAdminAccess();

    if (!admin) {
      alert("Tylko administrator może dodawać ogłoszenia.");
      return;
    }

    if (!announcementForm.title.trim() || !announcementForm.body.trim()) {
      alert("Wpisz tytuł i treść ogłoszenia.");
      return;
    }

    if (
      announcementForm.audience === "patrol" &&
      !announcementForm.patrolId
    ) {
      alert("Wybierz zastęp.");
      return;
    }

    setAnnouncementSaving(true);

    try {
      const { error } = await supabase.from("announcements").insert({
        title: announcementForm.title.trim(),
        body: announcementForm.body.trim(),
        whole_troop: announcementForm.audience === "whole",
        patrol_id:
          announcementForm.audience === "patrol"
            ? Number(announcementForm.patrolId)
            : null,
        important: announcementForm.important,
        pinned: announcementForm.pinned,
        expires_at: announcementForm.expiresAt || null,
        created_by: session.user.id,
      });

      if (error) throw error;

      setAnnouncementModalOpen(false);
      await loadAnnouncements();
    } catch (error) {
      console.error("Błąd zapisu ogłoszenia:", error);
      alert(`Nie udało się zapisać ogłoszenia.\n\n${error?.message || ""}`);
    } finally {
      setAnnouncementSaving(false);
    }
  }

  async function deleteAnnouncement(item) {
    const admin = await verifyAdminAccess();
    if (!admin) return;

    if (!window.confirm(`Usunąć ogłoszenie „${item.title}”?`)) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert(`Nie udało się usunąć ogłoszenia.\n\n${error.message}`);
      return;
    }

    await loadAnnouncements();
  }

  function openUserEditor(profile) {
    const membership = memberships.find(
      (item) => item.user_id === profile.id
    );

    const leaderPatrol = patrols.find(
      (item) => item.leader_id === profile.id
    );

    setUserEditor({
      id: profile.id,
      fullName: profile.full_name || "",
      role: normalizeRole(profile.role || "member"),
      functionTitle: profile.function_title || "",
      isStaff: Boolean(profile.is_staff),
      patrolId: membership?.patrol_id ? String(membership.patrol_id) : "",
      leaderPatrolId: leaderPatrol?.id ? String(leaderPatrol.id) : "",
    });
  }

  async function saveUserEditor() {
    const admin = await verifyAdminAccess();
    if (!admin || !userEditor) return;

    if (!userEditor.fullName.trim()) {
      alert("Wpisz imię i nazwisko.");
      return;
    }

    setUserSaving(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: userEditor.fullName.trim(),
          role: userEditor.role,
          function_title: userEditor.functionTitle.trim() || null,
          is_staff: userEditor.isStaff,
        })
        .eq("id", userEditor.id);

      if (profileError) throw profileError;

      const { error: deleteMembershipError } = await supabase
        .from("patrol_members")
        .delete()
        .eq("user_id", userEditor.id);

      if (deleteMembershipError) throw deleteMembershipError;

      if (userEditor.patrolId) {
        const { error: membershipError } = await supabase
          .from("patrol_members")
          .insert({
            user_id: userEditor.id,
            patrol_id: Number(userEditor.patrolId),
          });

        if (membershipError) throw membershipError;
      }

      const { error: clearLeaderError } = await supabase
        .from("patrols")
        .update({ leader_id: null })
        .eq("leader_id", userEditor.id);

      if (clearLeaderError) throw clearLeaderError;

      if (userEditor.leaderPatrolId) {
        const { error: leaderError } = await supabase
          .from("patrols")
          .update({
            leader_id: userEditor.id,
            leader_name: userEditor.fullName.trim(),
          })
          .eq("id", Number(userEditor.leaderPatrolId));

        if (leaderError) throw leaderError;
      }

      setUserEditor(null);

      await Promise.all([
        loadPeople(),
        loadSchedule(),
      ]);
    } catch (error) {
      console.error("Błąd zapisu użytkownika:", error);
      alert(`Nie udało się zapisać użytkownika.\n\n${error?.message || ""}`);
    } finally {
      setUserSaving(false);
    }
  }

  async function loadTasks() {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id,title,description,due_date,status,whole_troop,patrol_id,created_by,created_at"
      )
      .order("status")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Błąd pobierania zadań:", error);
      return;
    }

    setTasks(data || []);
  }

  function openTaskForm() {
    setTaskForm({
      title: "",
      description: "",
      dueDate: "",
      audience: "whole",
      patrolId: patrols[0]?.id ? String(patrols[0].id) : "",
    });

    setTaskModalOpen(true);
  }

  async function saveTask() {
    const admin = await verifyAdminAccess();

    if (!admin) {
      alert("Tylko administrator może dodawać zadania.");
      return;
    }

    if (!taskForm.title.trim()) {
      alert("Wpisz nazwę zadania.");
      return;
    }

    if (taskForm.audience === "patrol" && !taskForm.patrolId) {
      alert("Wybierz zastęp.");
      return;
    }

    setTaskSaving(true);

    try {
      const { error } = await supabase.from("tasks").insert({
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        due_date: taskForm.dueDate || null,
        status: "todo",
        whole_troop: taskForm.audience === "whole",
        patrol_id:
          taskForm.audience === "patrol"
            ? Number(taskForm.patrolId)
            : null,
        created_by: session.user.id,
      });

      if (error) throw error;

      setTaskModalOpen(false);
      await loadTasks();
    } catch (error) {
      console.error("Błąd zapisu zadania:", error);
      alert(`Nie udało się dodać zadania.\n\n${error?.message || ""}`);
    } finally {
      setTaskSaving(false);
    }
  }

  async function changeTaskStatus(task, status) {
    const admin = await verifyAdminAccess();

    if (!admin) {
      alert("Na razie status zadań zmienia administrator.");
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", task.id);

    if (error) {
      alert(`Nie udało się zmienić statusu.\n\n${error.message}`);
      return;
    }

    await loadTasks();
  }

  async function deleteTask(task) {
    const admin = await verifyAdminAccess();

    if (!admin) return;

    if (!window.confirm(`Usunąć zadanie „${task.title}”?`)) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id);

    if (error) {
      alert(`Nie udało się usunąć zadania.\n\n${error.message}`);
      return;
    }

    await loadTasks();
  }

  async function register(event) {
    event.preventDefault();

    if (!signupName.trim()) {
      setLoginError("Wpisz imię i nazwisko.");
      return;
    }

    if (password.length < 6) {
      setLoginError("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    setLoggingIn(true);
    setLoginError("");
    setSignupMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: signupName.trim(),
        },
      },
    });

    if (error) {
      setLoginError(error.message || "Nie udało się utworzyć konta.");
      setLoggingIn(false);
      return;
    }

    if (!data.session) {
      setSignupMessage(
        "Konto utworzone. Sprawdź skrzynkę e-mail i potwierdź adres, a potem się zaloguj."
      );
      setSignupMode(false);
    } else {
      setSignupMessage("Konto utworzone.");
    }

    setLoggingIn(false);
  }

  async function login(event) {
    event.preventDefault();

    setLoggingIn(true);
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginError(
        "Nie udało się zalogować. Sprawdź e-mail i hasło."
      );
    }

    setLoggingIn(false);
  }

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
    setRole(null);
    setReservations([]);
    setEvents([]);
    setTasks([]);
    setPeople([]);
    setMemberships([]);
    setAnnouncements([]);
    setMyPatrolIds([]);
    setActiveTab("Grafik");
  }

  async function handleReservationAudienceChange(value) {
    if (value !== "whole") {
      setForm((old) => ({ ...old, reserver: value }));
      return;
    }

    const admin = await verifyAdminAccess();

    if (admin) {
      setForm((old) => ({ ...old, reserver: "whole" }));
      return;
    }

    alert("Opcja „Cała drużyna” jest dostępna tylko dla administratora.");
    setForm((old) => ({
      ...old,
      reserver: String(patrols[0]?.id || ""),
    }));
  }

  function openReservation(time = "17:30", location = "Nora") {
    setForm({
      reserver: isAdmin ? "whole" : String(patrols[0]?.id || ""),
      location: MAIN_LOCATIONS.includes(location) ? location : "Inne",
      customLocation: MAIN_LOCATIONS.includes(location) ? "" : location,
      startTime: time,
      endTime: addMinutes(time, 30),
    });
    setModalOpen(true);
  }

  function selectCalendarDay(date) {
    const value = dateToString(date);

    setSelectedDate(value);
    setCalendarYear(date.getFullYear());
    setCalendarMonth(date.getMonth());
  }

  function changeDay(days) {
    const value = moveDate(selectedDate, days);
    const date = new Date(`${value}T12:00:00`);

    setSelectedDate(value);
    setCalendarYear(date.getFullYear());
    setCalendarMonth(date.getMonth());
  }

  function changeMonth(amount) {
    const date = new Date(
      calendarYear,
      calendarMonth + amount,
      1
    );

    setCalendarYear(date.getFullYear());
    setCalendarMonth(date.getMonth());
  }

  async function saveReservation() {
    if (!session?.user) return;

    const wholeTroop = form.reserver === "whole";

    if (wholeTroop) {
      const admin = await verifyAdminAccess();

      if (!admin) {
        alert("Tylko administrator może rezerwować dla całej drużyny.");
        return;
      }
    }

    const patrol = wholeTroop
      ? null
      : patrols.find((item) => String(item.id) === String(form.reserver));

    if (!wholeTroop && !patrol?.id) {
      alert("Wybierz zastęp.");
      return;
    }

    const finalLocation = form.location === "Inne" ? form.customLocation.trim() : form.location;
    if (!finalLocation) {
      alert("Wpisz miejsce zbiórki.");
      return;
    }
    if (!form.startTime || !form.endTime || form.endTime <= form.startTime) {
      alert("Godzina zakończenia musi być późniejsza niż rozpoczęcia.");
      return;
    }

    const starts = halfHourStarts(form.startTime, form.endTime);
    const valid = new Set(availableTimesForDate(selectedDate));
    if (!starts.length || starts.some((time) => !valid.has(time))) {
      alert("Wybrany przedział wykracza poza godziny dostępne w Grafiku.");
      return;
    }

    setSaving(true);
    const createdSlotIds = [];
    const createdReservationIds = [];

    try {
      const [
        { data: existingSlots, error: existingError },
        { data: sameDayEvents, error: eventCheckError },
      ] = await Promise.all([
        supabase
          .from("schedule_slots")
          .select("id,start_time,end_time,event_id")
          .eq("slot_date", selectedDate)
          .eq("location", finalLocation),
        supabase
          .from("events")
          .select("id,start_time,end_time")
          .eq("event_date", selectedDate)
          .eq("location", finalLocation),
      ]);

      if (existingError) throw existingError;
      if (eventCheckError) throw eventCheckError;

      const slotIds = (existingSlots || []).map((slot) => slot.id);
      let reservedSlotIds = new Set();

      if (slotIds.length) {
        const { data: existingReservations, error: reservationCheckError } = await supabase
          .from("schedule_reservations")
          .select("slot_id")
          .in("slot_id", slotIds);

        if (reservationCheckError) throw reservationCheckError;
        reservedSlotIds = new Set((existingReservations || []).map((item) => Number(item.slot_id)));
      }

      const slotByTime = new Map(
        (existingSlots || []).map((slot) => [normalizeTime(slot.start_time), slot])
      );

      const conflictSlot = starts.find((time) => {
        const slot = slotByTime.get(time);
        return slot && (slot.event_id || reservedSlotIds.has(Number(slot.id)));
      });

      const conflictEvent = (sameDayEvents || []).find((eventItem) => {
        const eventStart = normalizeTime(eventItem.start_time);
        const eventEnd = normalizeTime(eventItem.end_time) || addMinutes(eventStart, 30);
        return rangesOverlap(form.startTime, form.endTime, eventStart, eventEnd);
      });

      if (conflictSlot || conflictEvent) {
        alert(`${finalLocation} jest już zajęty w tym przedziale.`);
        return;
      }

      const missingStarts = starts.filter((time) => !slotByTime.has(time));
      let newSlots = [];

      if (missingStarts.length) {
        const { data, error: slotError } = await supabase
          .from("schedule_slots")
          .insert(missingStarts.map((time) => ({
            slot_date: selectedDate,
            start_time: `${time}:00`,
            end_time: `${addMinutes(time, 30)}:00`,
            location: finalLocation,
            notes: wholeTroop ? "Cała drużyna" : patrol.name,
            created_by: session.user.id,
          })))
          .select("id,start_time");

        if (slotError) throw slotError;
        newSlots = data || [];
        createdSlotIds.push(...newSlots.map((slot) => slot.id));
      }

      const allSlots = starts.map((time) => {
        const existing = slotByTime.get(time);
        if (existing) return existing;
        return newSlots.find((slot) => normalizeTime(slot.start_time) === time);
      }).filter(Boolean);

      const groupId = crypto.randomUUID();
      const reservationName = wholeTroop ? "Cała drużyna" : patrol.name;

      const { data: newReservations, error: reservationError } = await supabase
        .from("schedule_reservations")
        .insert(allSlots.map((slot) => ({
          slot_id: slot.id,
          patrol_id: wholeTroop ? null : patrol.id,
          reserved_by: session.user.id,
          reservation_name: reservationName,
          reservation_group: groupId,
        })))
        .select("id");

      if (reservationError) throw reservationError;
      createdReservationIds.push(...(newReservations || []).map((item) => item.id));

      setModalOpen(false);
      await loadSchedule();
    } catch (error) {
      console.error("Błąd zapisu:", error);
      if (createdReservationIds.length) {
        await supabase.from("schedule_reservations").delete().in("id", createdReservationIds);
      }
      if (createdSlotIds.length) {
        await supabase.from("schedule_slots").delete().in("id", createdSlotIds);
      }
      alert(`Nie udało się zapisać rezerwacji.\n\n${error?.message || ""}`);
    } finally {
      setSaving(false);
    }
  }

  async function removeReservation(reservation) {
    if (!reservation?.id || reservation.isEvent) return;

    const confirmed = window.confirm(
      `Anulować rezerwację ${reservation.patrol} — ${reservation.time}–${reservation.endTime}, ${reservation.location}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("schedule_reservations")
        .delete()
        .in("id", reservation.reservationIds || [reservation.id]);

      if (error) throw error;

      if (reservation.slotIds?.length) {
        const { error: slotDeleteError } = await supabase
          .from("schedule_slots")
          .delete()
          .in("id", reservation.slotIds);

        if (slotDeleteError) {
          console.warn("Rezerwacja usunięta, ale zostały puste sloty:", slotDeleteError);
        }
      }

      setDetailsOpen(null);
      await loadSchedule();
    } catch (error) {
      console.error("Błąd usuwania:", error);

      alert(
        "Nie udało się anulować rezerwacji. Możesz usuwać własne rezerwacje, a administrator może usuwać wszystkie."
      );
    }
  }

  if (loading) {
    return (
      <div style={centerScreen}>
        <strong>Ładowanie Centrum Dowodzenia...</strong>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        login={login}
        error={loginError}
        loggingIn={loggingIn}
        signupMode={signupMode}
        setSignupMode={setSignupMode}
        signupName={signupName}
        setSignupName={setSignupName}
        signupMessage={signupMessage}
        register={register}
      />
    );
  }

  if (role === "parent") {
    return <ParentApp logout={logout} />;
  }

  const dayReservations = reservations
    .filter((item) => item.date === selectedDate)
    .filter((item) => {
      if (locationFilter === "Wszystkie") return true;

      if (locationFilter === "Inne") {
        return !MAIN_LOCATIONS.includes(item.location);
      }

      return item.location === locationFilter;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  const calendarDays = getCalendarDays(
    calendarYear,
    calendarMonth
  );

  const monthName = new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(new Date(calendarYear, calendarMonth, 1));

  const validTimes = availableTimesForDate(selectedDate);

  const today = dateToString(new Date());
  const isAdmin = isAdminRole(role);

  const visibleEvents = events
    .filter((item) => item.event_date >= today)
    .filter((item) => {
      if (isAdmin) return true;
      if (item.whole_troop) return true;

      return myPatrolIds.includes(Number(item.patrol_id));
    });

  const ownReservations = reservations.filter(
    (item) =>
      !item.isEvent &&
      item.reservedBy === session.user.id &&
      item.date >= today
  );

  const visibleAnnouncements = announcements
    .filter((item) => {
      if (item.expires_at && item.expires_at < today) return false;
      if (isAdmin) return true;
      if (item.whole_troop) return true;
      return myPatrolIds.includes(Number(item.patrol_id));
    });

  const importantAnnouncement =
    visibleAnnouncements.find((item) => item.pinned) ||
    visibleAnnouncements.find((item) => item.important) ||
    null;

  const staffPeople = people.filter(
    (person) => person.is_staff || isAdminRole(person.role)
  );

  const visibleTasks = tasks
    .filter((task) => {
      if (isAdmin) return true;
      if (task.whole_troop) return true;
      return myPatrolIds.includes(Number(task.patrol_id));
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "done" ? 1 : -1;

      const aDate = a.due_date || "9999-12-31";
      const bDate = b.due_date || "9999-12-31";
      return aDate.localeCompare(bDate);
    });

  const openTasks = visibleTasks.filter((task) => task.status !== "done");

  const upcomingTrips = visibleEvents
    .filter((item) => isTripType(item.event_type))
    .filter((item) => item.event_date >= today)
    .sort((a, b) =>
      `${a.event_date}T${normalizeTime(a.start_time)}`.localeCompare(
        `${b.event_date}T${normalizeTime(b.start_time)}`
      )
    );

  const nextTrip = upcomingTrips[0] || null;

  const myItems = [
    ...visibleEvents.map((item) => ({
      kind: "event",
      date: item.event_date,
      time: normalizeTime(item.start_time),
      data: item,
    })),

    ...ownReservations.map((item) => ({
      kind: "reservation",
      date: item.date,
      time: item.time,
      data: item,
    })),
  ].sort((a, b) =>
    `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
  );

  return (
    <main style={appStyle}>
      <AppHeader
        subtitle={
          isAdmin
            ? "Panel administratora"
            : "Centrum drużyny"
        }
        logout={logout}
      />

      <section style={containerPadding}>
        {activeTab === "Grafik" && (
          <>
            <MonthlyCalendar
              calendarDays={calendarDays}
              monthName={monthName}
              selectedDate={selectedDate}
              reservations={reservations}
              changeMonth={changeMonth}
              selectCalendarDay={selectCalendarDay}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 15,
                alignItems: "center",
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={eyebrowStyle}>
                  Grafik harcówki
                </div>

                <h2
                  style={{
                    margin: "4px 0 0",
                    fontSize: 23,
                    textTransform: "capitalize",
                  }}
                >
                  {formatDate(selectedDate)}
                </h2>
              </div>

              <button
                style={primaryStyle}
                onClick={() => openReservation()}
              >
                + Rezerwacja
              </button>
            </div>

            <div
              style={{
                ...cardStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <button
                style={secondaryStyle}
                onClick={() => changeDay(-1)}
              >
                ←
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) return;

                  const date = new Date(
                    `${value}T12:00:00`
                  );

                  setSelectedDate(value);
                  setCalendarYear(date.getFullYear());
                  setCalendarMonth(date.getMonth());
                }}
                style={{
                  border: 0,
                  fontWeight: 800,
                  fontSize: 15,
                  background: "transparent",
                  color: "#17231c",
                }}
              />

              <button
                style={secondaryStyle}
                onClick={() => changeDay(1)}
              >
                →
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 4,
                marginBottom: 18,
              }}
            >
              {[
                "Wszystkie",
                "Nora",
                "Basecamp",
                "Inne",
              ].map((location) => (
                <button
                  key={location}
                  onClick={() =>
                    setLocationFilter(location)
                  }
                  style={{
                    border:
                      locationFilter === location
                        ? "1px solid #173b2b"
                        : "1px solid #d5d9d5",
                    background:
                      locationFilter === location
                        ? "#173b2b"
                        : "white",
                    color:
                      locationFilter === location
                        ? "white"
                        : "#273b31",
                    borderRadius: 30,
                    padding: "9px 16px",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    fontWeight:
                      locationFilter === location
                        ? 700
                        : 500,
                  }}
                >
                  {location}
                </button>
              ))}
            </div>

            {scheduleLoading && (
              <div
                style={{
                  ...cardStyle,
                  textAlign: "center",
                  color: "#68736d",
                  marginBottom: 12,
                }}
              >
                Pobieram rezerwacje...
              </div>
            )}

            {!scheduleLoading &&
              dayReservations.length === 0 && (
                <div
                  style={{
                    ...cardStyle,
                    textAlign: "center",
                    color: "#68736d",
                    marginBottom: 12,
                  }}
                >
                  Brak rezerwacji na ten dzień.
                </div>
              )}

            <div style={{ display: "grid", gap: 10 }}>
              {dayReservations.map((reservation) => (
                <button
                  key={reservation.id}
                  onClick={() => {
                    if (reservation.isEvent) {
                      const found = events.find(
                        (item) =>
                          Number(item.id) ===
                          Number(reservation.eventId)
                      );

                      if (found) setEventDetails(found);
                    } else {
                      setDetailsOpen(reservation);
                    }
                  }}
                  style={{
                    ...cardStyle,
                    width: "100%",
                    border: 0,
                    borderLeft: reservation.isEvent
                      ? "5px solid #607b54"
                      : "5px solid #8b2635",
                    textAlign: "left",
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(90px,110px) 1fr auto",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    color: "#17231c",
                  }}
                >
                  <strong>
                    {reservation.time}–
                    {reservation.endTime ||
                      addMinutes(reservation.time, 30)}
                  </strong>

                  <div>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                      }}
                    >
                      {reservation.patrol}
                    </div>

                    <div
                      style={{
                        color: "#6a746e",
                        fontSize: 13,
                        marginTop: 3,
                      }}
                    >
                      {reservation.isEvent
                        ? "wydarzenie"
                        : reservation.leader ||
                          "lider zastępu"}
                    </div>
                  </div>

                  <span
                    style={{
                      background: "#edf1ed",
                      padding: "8px 10px",
                      borderRadius: 11,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {reservation.location}
                  </span>
                </button>
              ))}
            </div>
            <h3 style={{ margin: "26px 0 10px" }}>
              Wolne terminy
            </h3>

            <div style={{ display: "grid", gap: 8 }}>
              {locationFilter !== "Inne" &&
                validTimes.flatMap((time) => {
                  const locations =
                    locationFilter === "Wszystkie"
                      ? MAIN_LOCATIONS
                      : [locationFilter];

                  return locations.map((location) => {
                    const occupied = reservations.some(
                      (item) =>
                        item.date === selectedDate &&
                        item.location === location &&
                        time >= item.time &&
                        time < item.endTime
                    );

                    if (occupied) return null;

                    return (
                      <div
                        key={`${time}-${location}`}
                        style={{
                          border: "2px dashed #ccd2cd",
                          borderRadius: 16,
                          padding: 14,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div>
                          <strong>
                            {time}–{addMinutes(time, 30)}
                          </strong>

                          <div
                            style={{
                              fontSize: 13,
                              color: "#6c756f",
                              marginTop: 3,
                            }}
                          >
                            {location} • wolne
                          </div>
                        </div>

                        <button
                          style={secondaryStyle}
                          onClick={() =>
                            openReservation(time, location)
                          }
                        >
                          Zarezerwuj
                        </button>
                      </div>
                    );
                  });
                })}

              <button
                onClick={() =>
                  openReservation(
                    validTimes[0] || "17:30",
                    "Inne miejsce"
                  )
                }
                style={{
                  border: "2px dashed #b98a2f",
                  borderRadius: 16,
                  padding: 15,
                  background: "#fffdf7",
                  color: "#72571e",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                + Zarezerwuj inne miejsce
              </button>
            </div>
          </>
        )}

        {activeTab === "Moje" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={eyebrowStyle}>
                  Twoje centrum
                </div>

                <h2 style={{ margin: "4px 0 0" }}>
                  Co mnie czeka?
                </h2>
              </div>

              {isAdmin && (
                <button
                  style={primaryStyle}
                  onClick={openEventForm}
                >
                  + Wydarzenie
                </button>
              )}
            </div>

            {importantAnnouncement && (
              <button
                onClick={() => {
                  setActiveTab("Więcej");
                  setMoreSection("announcements");
                }}
                style={{
                  ...cardStyle,
                  width: "100%",
                  border: 0,
                  borderLeft: importantAnnouncement.important
                    ? "5px solid #8b2635"
                    : "5px solid #b98a2f",
                  textAlign: "left",
                  cursor: "pointer",
                  marginBottom: 14,
                  color: "#17231c",
                }}
              >
                <div style={eyebrowStyle}>
                  {importantAnnouncement.pinned
                    ? "📌 PRZYPIĘTE OGŁOSZENIE"
                    : "WAŻNE OGŁOSZENIE"}
                </div>

                <h3 style={{ margin: "7px 0 7px" }}>
                  {importantAnnouncement.title}
                </h3>

                <div
                  style={{
                    color: "#5c6861",
                    lineHeight: 1.55,
                  }}
                >
                  {importantAnnouncement.body}
                </div>
              </button>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 9,
                marginBottom: 16,
              }}
            >
              <MiniStat
                value={visibleEvents.length}
                label="wydarzenia"
              />
              <MiniStat
                value={ownReservations.length}
                label="rezerwacje"
              />
              <MiniStat
                value={upcomingTrips.length}
                label="wyjazdy"
              />
              <MiniStat
                value={openTasks.length}
                label="zadania"
              />
            </div>

            {nextTrip && (
              <button
                onClick={() => setEventDetails(nextTrip)}
                style={{
                  ...cardStyle,
                  width: "100%",
                  border: 0,
                  background: "#173b2b",
                  color: "white",
                  textAlign: "left",
                  cursor: "pointer",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 1.3,
                    color: "#d9bd72",
                  }}
                >
                  NAJBLIŻSZY WYJAZD • {tripCountdownLabel(nextTrip.event_date).toUpperCase()}
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    marginTop: 7,
                  }}
                >
                  {nextTrip.title}
                </div>

                <div
                  style={{
                    marginTop: 7,
                    color: "#d9e3dd",
                    lineHeight: 1.6,
                  }}
                >
                  📅 {formatDate(nextTrip.event_date)}
                  <br />
                  📍 {nextTrip.location}
                  {nextTrip.cost ? ` • 💰 ${nextTrip.cost}` : ""}
                </div>
              </button>
            )}

            {myItems.length === 0 && (
              <div
                style={{
                  ...cardStyle,
                  color: "#68736d",
                  textAlign: "center",
                }}
              >
                Na razie nic tutaj nie ma.
              </div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
              {myItems.map((item) => {
                if (item.kind === "reservation") {
                  const reservation = item.data;

                  return (
                    <button
                      key={`reservation-${reservation.id}`}
                      onClick={() =>
                        setDetailsOpen(reservation)
                      }
                      style={{
                        ...cardStyle,
                        border: 0,
                        borderLeft: "5px solid #b98a2f",
                        textAlign: "left",
                        cursor: "pointer",
                        color: "#17231c",
                      }}
                    >
                      <div style={eyebrowStyle}>
                        MOJA REZERWACJA
                      </div>

                      <h3
                        style={{
                          margin: "7px 0 8px",
                          fontSize: 19,
                        }}
                      >
                        {reservation.patrol}
                      </h3>

                      <div
                        style={{
                          lineHeight: 1.7,
                          color: "#526159",
                        }}
                      >
                        📅 {formatDate(reservation.date)}
                        <br />
                        🕐 {reservation.time}–
                        {reservation.endTime ||
                          addMinutes(
                            reservation.time,
                            30
                          )}
                        <br />
                        📍 {reservation.location}
                      </div>
                    </button>
                  );
                }

                const eventItem = item.data;

                const patrol = patrols.find(
                  (patrolItem) =>
                    Number(patrolItem.id) ===
                    Number(eventItem.patrol_id)
                );

                return (
                  <button
                    key={`event-${eventItem.id}`}
                    onClick={() =>
                      setEventDetails(eventItem)
                    }
                    style={{
                      ...cardStyle,
                      border: 0,
                      borderLeft: eventItem.whole_troop
                        ? "5px solid #8b2635"
                        : "5px solid #607b54",
                      textAlign: "left",
                      cursor: "pointer",
                      color: "#17231c",
                    }}
                  >
                    <div style={eyebrowStyle}>
                      {eventItem.whole_troop
                        ? "CAŁA DRUŻYNA"
                        : isAdmin
                        ? `ZASTĘP • ${
                            patrol?.name || "Zastęp"
                          }`
                        : "TWÓJ ZASTĘP"}
                    </div>

                    <h3
                      style={{
                        margin: "7px 0 8px",
                        fontSize: 19,
                      }}
                    >
                      {eventItem.title}
                    </h3>

                    <div
                      style={{
                        lineHeight: 1.7,
                        color: "#526159",
                      }}
                    >
                      📅 {formatDate(
                        eventItem.event_date
                      )}
                      <br />

                      🕐 {normalizeTime(
                        eventItem.start_time
                      )}
                      {eventItem.end_time
                        ? `–${normalizeTime(
                            eventItem.end_time
                          )}`
                        : ""}
                      <br />

                      📍 {eventItem.location}

                      {eventItem.what_to_bring && (
                        <>
                          <br />
                          🎒 {eventItem.what_to_bring}
                        </>
                      )}

                      {eventItem.cost && (
                        <>
                          <br />
                          💰 {eventItem.cost}
                          {eventItem.payment_deadline
                            ? ` • do ${formatDate(
                                eventItem.payment_deadline
                              )}`
                            : ""}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "Wyjazdy" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={eyebrowStyle}>Wyprawy drużyny</div>
                <h2 style={{ margin: "4px 0 0" }}>Wyjazdy</h2>
              </div>

              {isAdmin && (
                <button
                  style={primaryStyle}
                  onClick={() => openEventForm("wyjazd")}
                >
                  + Dodaj wyjazd
                </button>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 9,
                marginBottom: 18,
              }}
            >
              <MiniStat value={upcomingTrips.length} label="nadchodzące" />
              <MiniStat
                value={upcomingTrips.filter((item) => item.cost).length}
                label="płatne"
              />
              <MiniStat
                value={upcomingTrips.filter((item) => item.what_to_bring).length}
                label="z listą rzeczy"
              />
            </div>

            {isAdmin && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 5,
                  marginBottom: 16,
                }}
              >
                {[
                  ["wyjazd", "Wyjazd"],
                  ["biwak", "Biwak"],
                  ["rajd", "Rajd"],
                  ["zawody", "Zawody"],
                ].map(([type, label]) => (
                  <button
                    key={type}
                    style={secondaryStyle}
                    onClick={() => openEventForm(type)}
                  >
                    + {label}
                  </button>
                ))}
              </div>
            )}

            {upcomingTrips.length === 0 ? (
              <div
                style={{
                  ...cardStyle,
                  textAlign: "center",
                  color: "#68736d",
                }}
              >
                Nie ma jeszcze żadnych nadchodzących wyjazdów.
                {isAdmin && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      style={primaryStyle}
                      onClick={() => openEventForm("wyjazd")}
                    >
                      Dodaj pierwszy wyjazd
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {upcomingTrips.map((trip) => {
                  const patrol = patrols.find(
                    (item) => Number(item.id) === Number(trip.patrol_id)
                  );

                  return (
                    <button
                      key={`trip-${trip.id}`}
                      onClick={() => setEventDetails(trip)}
                      style={{
                        ...cardStyle,
                        border: 0,
                        borderLeft: "5px solid #607b54",
                        textAlign: "left",
                        cursor: "pointer",
                        color: "#17231c",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={eyebrowStyle}>
                            {eventTypeLabel(trip.event_type).toUpperCase()}
                            {" • "}
                            {trip.whole_troop
                              ? "CAŁA DRUŻYNA"
                              : patrol?.name || "ZASTĘP"}
                          </div>

                          <h3
                            style={{
                              margin: "7px 0 8px",
                              fontSize: 20,
                            }}
                          >
                            {trip.title}
                          </h3>
                        </div>

                        <span
                          style={{
                            background: "#edf2ee",
                            color: "#42604f",
                            borderRadius: 20,
                            padding: "7px 10px",
                            fontSize: 11,
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {tripCountdownLabel(trip.event_date)}
                        </span>
                      </div>

                      <div
                        style={{
                          color: "#526159",
                          lineHeight: 1.7,
                        }}
                      >
                        📅 {formatDate(trip.event_date)}
                        <br />
                        🕐 {normalizeTime(trip.start_time)}
                        {trip.end_time ? `–${normalizeTime(trip.end_time)}` : ""}
                        <br />
                        📍 {trip.location}

                        {trip.cost && (
                          <>
                            <br />
                            💰 {trip.cost}
                            {trip.payment_deadline
                              ? ` • płatność do ${formatDate(trip.payment_deadline)}`
                              : ""}
                          </>
                        )}

                        {trip.what_to_bring && (
                          <>
                            <br />
                            🎒 {trip.what_to_bring}
                          </>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          color: "#8b2635",
                          fontWeight: 800,
                          fontSize: 13,
                        }}
                      >
                        Zobacz szczegóły →
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "Zadania" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={eyebrowStyle}>Do zrobienia</div>
                <h2 style={{ margin: "4px 0 0" }}>Zadania</h2>
              </div>

              {isAdmin && (
                <button
                  style={primaryStyle}
                  onClick={openTaskForm}
                >
                  + Zadanie
                </button>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 9,
                marginBottom: 18,
              }}
            >
              <MiniStat
                value={openTasks.length}
                label="do zrobienia"
              />
              <MiniStat
                value={
                  openTasks.filter(
                    (task) =>
                      task.due_date &&
                      daysUntil(task.due_date) < 0
                  ).length
                }
                label="po terminie"
              />
              <MiniStat
                value={
                  visibleTasks.filter(
                    (task) => task.status === "done"
                  ).length
                }
                label="zrobione"
              />
            </div>

            {visibleTasks.length === 0 ? (
              <div
                style={{
                  ...cardStyle,
                  textAlign: "center",
                  color: "#68736d",
                }}
              >
                Brak zadań.
                {isAdmin && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      style={primaryStyle}
                      onClick={openTaskForm}
                    >
                      Dodaj pierwsze zadanie
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 11 }}>
                {visibleTasks.map((task) => {
                  const patrol = patrols.find(
                    (item) =>
                      Number(item.id) === Number(task.patrol_id)
                  );

                  const overdue =
                    task.due_date &&
                    task.status !== "done" &&
                    daysUntil(task.due_date) < 0;

                  return (
                    <div
                      key={`task-${task.id}`}
                      style={{
                        ...cardStyle,
                        borderLeft:
                          task.status === "done"
                            ? "5px solid #607b54"
                            : overdue
                            ? "5px solid #8b2635"
                            : "5px solid #b98a2f",
                        opacity:
                          task.status === "done" ? 0.72 : 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div style={eyebrowStyle}>
                            {task.whole_troop
                              ? "CAŁA DRUŻYNA"
                              : patrol?.name || "ZASTĘP"}
                          </div>

                          <h3
                            style={{
                              margin: "7px 0 7px",
                              textDecoration:
                                task.status === "done"
                                  ? "line-through"
                                  : "none",
                            }}
                          >
                            {task.title}
                          </h3>
                        </div>

                        <span
                          style={{
                            background:
                              task.status === "done"
                                ? "#edf2ee"
                                : overdue
                                ? "#fff0f1"
                                : "#fff8e8",
                            color:
                              task.status === "done"
                                ? "#42604f"
                                : overdue
                                ? "#8b2635"
                                : "#74591e",
                            borderRadius: 20,
                            padding: "7px 9px",
                            fontSize: 10,
                            fontWeight: 900,
                            textAlign: "center",
                          }}
                        >
                          {task.status === "done"
                            ? "ZROBIONE"
                            : taskDeadlineLabel(task.due_date)}
                        </span>
                      </div>

                      {task.description && (
                        <p
                          style={{
                            color: "#56635c",
                            lineHeight: 1.6,
                            marginBottom: 10,
                          }}
                        >
                          {task.description}
                        </p>
                      )}

                      {task.due_date && (
                        <div
                          style={{
                            color: "#6a746e",
                            fontSize: 13,
                          }}
                        >
                          📅 {formatDate(task.due_date)}
                        </div>
                      )}

                      {isAdmin && (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 13,
                            flexWrap: "wrap",
                          }}
                        >
                          {task.status !== "done" ? (
                            <button
                              style={secondaryStyle}
                              onClick={() =>
                                changeTaskStatus(task, "done")
                              }
                            >
                              ✓ Oznacz jako zrobione
                            </button>
                          ) : (
                            <button
                              style={secondaryStyle}
                              onClick={() =>
                                changeTaskStatus(task, "todo")
                              }
                            >
                              ↶ Przywróć
                            </button>
                          )}

                          <button
                            style={{
                              ...secondaryStyle,
                              color: "#8b2635",
                              borderColor: "#dfc1c5",
                            }}
                            onClick={() => deleteTask(task)}
                          >
                            Usuń
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "Więcej" && (
          <>
            {moreSection !== "menu" && (
              <button
                style={{
                  ...secondaryStyle,
                  marginBottom: 15,
                }}
                onClick={() => setMoreSection("menu")}
              >
                ← Wróć
              </button>
            )}

            {moreSection === "menu" && (
              <>
                <div style={eyebrowStyle}>Centrum drużyny</div>
                <h2 style={{ marginTop: 5 }}>Więcej</h2>

                <div style={{ display: "grid", gap: 10 }}>
                  <MoreMenuButton
                    icon="📣"
                    title="Ogłoszenia"
                    subtitle={`${visibleAnnouncements.length} aktywnych`}
                    onClick={() => setMoreSection("announcements")}
                  />

                  <MoreMenuButton
                    icon="⚜️"
                    title="Kadra"
                    subtitle={`${staffPeople.length} osób`}
                    onClick={() => setMoreSection("staff")}
                  />

                  {isAdmin && (
                    <MoreMenuButton
                      icon="👥"
                      title="Użytkownicy"
                      subtitle={`${people.length} kont`}
                      onClick={() => setMoreSection("users")}
                    />
                  )}

                  <MoreMenuButton
                    icon="📄"
                    title="Dokumenty"
                    subtitle="zgody, regulaminy, pliki"
                    onClick={() =>
                      alert("Dokumenty dołączymy w kolejnym dużym update.")
                    }
                  />
                </div>
              </>
            )}

            {moreSection === "announcements" && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 18,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={eyebrowStyle}>Komunikaty</div>
                    <h2 style={{ margin: "4px 0 0" }}>
                      Ogłoszenia
                    </h2>
                  </div>

                  {isAdmin && (
                    <button
                      style={primaryStyle}
                      onClick={openAnnouncementForm}
                    >
                      + Ogłoszenie
                    </button>
                  )}
                </div>

                {visibleAnnouncements.length === 0 ? (
                  <div
                    style={{
                      ...cardStyle,
                      textAlign: "center",
                      color: "#68736d",
                    }}
                  >
                    Brak aktywnych ogłoszeń.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 11 }}>
                    {visibleAnnouncements.map((item) => {
                      const patrol = patrols.find(
                        (p) => Number(p.id) === Number(item.patrol_id)
                      );

                      return (
                        <div
                          key={`announcement-${item.id}`}
                          style={{
                            ...cardStyle,
                            borderLeft: item.important
                              ? "5px solid #8b2635"
                              : item.pinned
                              ? "5px solid #b98a2f"
                              : "5px solid #607b54",
                          }}
                        >
                          <div style={eyebrowStyle}>
                            {item.pinned ? "📌 " : ""}
                            {item.whole_troop
                              ? "CAŁA DRUŻYNA"
                              : patrol?.name || "ZASTĘP"}
                            {item.important ? " • WAŻNE" : ""}
                          </div>

                          <h3 style={{ margin: "7px 0 8px" }}>
                            {item.title}
                          </h3>

                          <div
                            style={{
                              color: "#55635b",
                              lineHeight: 1.65,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {item.body}
                          </div>

                          {item.expires_at && (
                            <div
                              style={{
                                marginTop: 10,
                                color: "#7a837e",
                                fontSize: 12,
                              }}
                            >
                              Widoczne do: {formatDate(item.expires_at)}
                            </div>
                          )}

                          {isAdmin && (
                            <button
                              style={{
                                ...secondaryStyle,
                                marginTop: 12,
                                color: "#8b2635",
                                borderColor: "#dfc1c5",
                              }}
                              onClick={() => deleteAnnouncement(item)}
                            >
                              Usuń
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {moreSection === "staff" && (
              <>
                <div style={eyebrowStyle}>Ludzie</div>
                <h2 style={{ marginTop: 5 }}>Kadra</h2>

                {staffPeople.length === 0 ? (
                  <div style={cardStyle}>
                    <p
                      style={{
                        margin: 0,
                        color: "#68736d",
                      }}
                    >
                      Kadra nie została jeszcze uzupełniona. Admin może
                      oznaczyć osoby jako kadrę w sekcji Użytkownicy.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 11 }}>
                    {staffPeople.map((person) => {
                      const membership = memberships.find(
                        (item) => item.user_id === person.id
                      );
                      const patrol = patrols.find(
                        (item) =>
                          Number(item.id) ===
                          Number(membership?.patrol_id)
                      );
                      const leaderPatrol = patrols.find(
                        (item) => item.leader_id === person.id
                      );

                      return (
                        <div
                          key={`staff-${person.id}`}
                          style={{
                            ...cardStyle,
                            borderLeft: "5px solid #173b2b",
                          }}
                        >
                          <div style={eyebrowStyle}>
                            {isAdminRole(person.role)
                              ? "ADMIN"
                              : "KADRA"}
                          </div>

                          <h3 style={{ margin: "7px 0 6px" }}>
                            {person.full_name || "Nieuzupełniony profil"}
                          </h3>

                          <div
                            style={{
                              color: "#56635c",
                              lineHeight: 1.65,
                            }}
                          >
                            {person.function_title ||
                              (leaderPatrol
                                ? `Zastępowy/a — ${leaderPatrol.name}`
                                : "Funkcja do uzupełnienia")}

                            {patrol && (
                              <>
                                <br />
                                ⚜️ {patrol.name}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {moreSection === "users" && isAdmin && (
              <>
                <div style={eyebrowStyle}>Panel administratora</div>
                <h2 style={{ marginTop: 5 }}>Użytkownicy</h2>

                <div
                  style={{
                    ...cardStyle,
                    background: "#fff9e9",
                    border: "1px solid #ead8a7",
                    boxShadow: "none",
                    marginBottom: 14,
                    color: "#6f5722",
                    lineHeight: 1.55,
                  }}
                >
                  Nowa osoba najpierw zakłada konto na ekranie logowania.
                  Potem tutaj przypisujesz jej rolę, zastęp, funkcję i
                  ewentualnie status zastępowego.
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {people.map((person) => {
                    const membership = memberships.find(
                      (item) => item.user_id === person.id
                    );
                    const patrol = patrols.find(
                      (item) =>
                        Number(item.id) ===
                        Number(membership?.patrol_id)
                    );
                    const leaderPatrol = patrols.find(
                      (item) => item.leader_id === person.id
                    );

                    return (
                      <button
                        key={`person-${person.id}`}
                        onClick={() => openUserEditor(person)}
                        style={{
                          ...cardStyle,
                          border: 0,
                          width: "100%",
                          textAlign: "left",
                          cursor: "pointer",
                          color: "#17231c",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <div>
                            <strong>
                              {person.full_name || "Nowe konto"}
                            </strong>

                            <div
                              style={{
                                marginTop: 5,
                                color: "#66726b",
                                fontSize: 13,
                              }}
                            >
                              {normalizeRole(person.role) || "member"}
                              {patrol ? ` • ${patrol.name}` : ""}
                              {leaderPatrol
                                ? ` • zastępowy/a ${leaderPatrol.name}`
                                : ""}
                            </div>
                          </div>

                          <span style={{ color: "#8b2635" }}>Edytuj →</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </section>

      <BottomNav
        tabs={[
          "Grafik",
          "Moje",
          "Wyjazdy",
          "Zadania",
          "Więcej",
        ]}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {announcementModalOpen && (
        <ModalBackground
          close={() =>
            !announcementSaving &&
            setAnnouncementModalOpen(false)
          }
        >
          <div style={eyebrowStyle}>Panel administratora</div>
          <h2 style={{ marginTop: 5 }}>Nowe ogłoszenie</h2>

          <div style={{ display: "grid", gap: 15 }}>
            <label>
              <strong>Tytuł</strong>
              <input
                value={announcementForm.title}
                onChange={(event) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    title: event.target.value,
                  })
                }
                placeholder="np. Zmiana miejsca zbiórki"
                style={inputStyle}
              />
            </label>

            <label>
              <strong>Treść</strong>
              <textarea
                rows={5}
                value={announcementForm.body}
                onChange={(event) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    body: event.target.value,
                  })
                }
                placeholder="Napisz komunikat..."
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </label>

            <label>
              <strong>Dla kogo?</strong>
              <select
                value={announcementForm.audience}
                onChange={(event) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    audience: event.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="whole">Cała drużyna</option>
                <option value="patrol">Konkretny zastęp</option>
              </select>
            </label>

            {announcementForm.audience === "patrol" && (
              <label>
                <strong>Zastęp</strong>
                <select
                  value={announcementForm.patrolId}
                  onChange={(event) =>
                    setAnnouncementForm({
                      ...announcementForm,
                      patrolId: event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {patrols.map((patrol) => (
                    <option
                      key={patrol.id}
                      value={String(patrol.id)}
                    >
                      {patrol.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <strong>Widoczne do</strong>
              <input
                type="date"
                value={announcementForm.expiresAt}
                onChange={(event) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    expiresAt: event.target.value,
                  })
                }
                style={inputStyle}
              />
            </label>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                type="checkbox"
                checked={announcementForm.important}
                onChange={(event) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    important: event.target.checked,
                  })
                }
              />
              <strong>Ważne ogłoszenie</strong>
            </label>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                type="checkbox"
                checked={announcementForm.pinned}
                onChange={(event) =>
                  setAnnouncementForm({
                    ...announcementForm,
                    pinned: event.target.checked,
                  })
                }
              />
              <strong>Przypnij na górze</strong>
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 9,
              }}
            >
              <button
                style={secondaryStyle}
                disabled={announcementSaving}
                onClick={() => setAnnouncementModalOpen(false)}
              >
                Anuluj
              </button>

              <button
                style={primaryStyle}
                disabled={announcementSaving}
                onClick={saveAnnouncement}
              >
                {announcementSaving ? "Zapisuję..." : "Opublikuj"}
              </button>
            </div>
          </div>
        </ModalBackground>
      )}

      {userEditor && (
        <ModalBackground
          close={() => !userSaving && setUserEditor(null)}
        >
          <div style={eyebrowStyle}>Panel administratora</div>
          <h2 style={{ marginTop: 5 }}>Edytuj użytkownika</h2>

          <div style={{ display: "grid", gap: 15 }}>
            <label>
              <strong>Imię i nazwisko</strong>
              <input
                value={userEditor.fullName}
                onChange={(event) =>
                  setUserEditor({
                    ...userEditor,
                    fullName: event.target.value,
                  })
                }
                style={inputStyle}
              />
            </label>

            <label>
              <strong>Rola w aplikacji</strong>
              <select
                value={userEditor.role}
                onChange={(event) =>
                  setUserEditor({
                    ...userEditor,
                    role: event.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="member">Harcerz / członek</option>
                <option value="parent">Rodzic</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <label>
              <strong>Funkcja</strong>
              <input
                value={userEditor.functionTitle}
                onChange={(event) =>
                  setUserEditor({
                    ...userEditor,
                    functionTitle: event.target.value,
                  })
                }
                placeholder="np. przyboczny, zastępowa..."
                style={inputStyle}
              />
            </label>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                type="checkbox"
                checked={userEditor.isStaff}
                onChange={(event) =>
                  setUserEditor({
                    ...userEditor,
                    isStaff: event.target.checked,
                  })
                }
              />
              <strong>Pokaż w zakładce Kadra</strong>
            </label>

            <label>
              <strong>Zastęp</strong>
              <select
                value={userEditor.patrolId}
                onChange={(event) =>
                  setUserEditor({
                    ...userEditor,
                    patrolId: event.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="">Brak przypisania</option>
                {patrols.map((patrol) => (
                  <option
                    key={patrol.id}
                    value={String(patrol.id)}
                  >
                    {patrol.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <strong>Zastępowy/a</strong>
              <select
                value={userEditor.leaderPatrolId}
                onChange={(event) =>
                  setUserEditor({
                    ...userEditor,
                    leaderPatrolId: event.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="">Nie jest zastępowym</option>
                {patrols.map((patrol) => (
                  <option
                    key={patrol.id}
                    value={String(patrol.id)}
                  >
                    {patrol.name}
                  </option>
                ))}
              </select>
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 9,
              }}
            >
              <button
                style={secondaryStyle}
                disabled={userSaving}
                onClick={() => setUserEditor(null)}
              >
                Anuluj
              </button>

              <button
                style={primaryStyle}
                disabled={userSaving}
                onClick={saveUserEditor}
              >
                {userSaving ? "Zapisuję..." : "Zapisz"}
              </button>
            </div>
          </div>
        </ModalBackground>
      )}

      {taskModalOpen && (
        <ModalBackground
          close={() =>
            !taskSaving && setTaskModalOpen(false)
          }
        >
          <div style={eyebrowStyle}>Panel administratora</div>
          <h2 style={{ marginTop: 5 }}>Nowe zadanie</h2>

          <div style={{ display: "grid", gap: 15 }}>
            <label>
              <strong>Nazwa zadania</strong>
              <input
                type="text"
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm({
                    ...taskForm,
                    title: event.target.value,
                  })
                }
                placeholder="np. Przygotować apteczkę na INO"
                style={inputStyle}
              />
            </label>

            <label>
              <strong>Dla kogo?</strong>
              <select
                value={taskForm.audience}
                onChange={(event) =>
                  setTaskForm({
                    ...taskForm,
                    audience: event.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="whole">Cała drużyna</option>
                <option value="patrol">Konkretny zastęp</option>
              </select>
            </label>

            {taskForm.audience === "patrol" && (
              <label>
                <strong>Zastęp</strong>
                <select
                  value={taskForm.patrolId}
                  onChange={(event) =>
                    setTaskForm({
                      ...taskForm,
                      patrolId: event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {patrols.map((patrol) => (
                    <option
                      key={patrol.id}
                      value={String(patrol.id)}
                    >
                      {patrol.name} — {patrol.leader_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <strong>Termin</strong>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(event) =>
                  setTaskForm({
                    ...taskForm,
                    dueDate: event.target.value,
                  })
                }
                style={inputStyle}
              />
            </label>

            <label>
              <strong>Opis</strong>
              <textarea
                rows={4}
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm({
                    ...taskForm,
                    description: event.target.value,
                  })
                }
                placeholder="Co dokładnie trzeba zrobić?"
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 9,
              }}
            >
              <button
                style={secondaryStyle}
                disabled={taskSaving}
                onClick={() => setTaskModalOpen(false)}
              >
                Anuluj
              </button>

              <button
                style={{
                  ...primaryStyle,
                  opacity: taskSaving ? 0.6 : 1,
                }}
                disabled={taskSaving}
                onClick={saveTask}
              >
                {taskSaving ? "Zapisuję..." : "Dodaj zadanie"}
              </button>
            </div>
          </div>
        </ModalBackground>
      )}

      {eventModalOpen && (
        <ModalBackground
          close={() =>
            !eventSaving && setEventModalOpen(false)
          }
        >
          <div style={eyebrowStyle}>
            Panel administratora
          </div>

          <h2 style={{ marginTop: 5 }}>
            Nowe wydarzenie
          </h2>

          <p
            style={{
              color: "#69746d",
              marginTop: -5,
              lineHeight: 1.5,
            }}
          >
            Dodaj zbiórkę, służbę, wyjazd lub inne
            wydarzenie drużyny.
          </p>

          <div style={{ display: "grid", gap: 15 }}>
            <label>
              <strong>Nazwa wydarzenia</strong>

              <input
                type="text"
                value={eventForm.title}
                onChange={(event) =>
                  setEventForm({
                    ...eventForm,
                    title: event.target.value,
                  })
                }
                placeholder="np. Zbiórka drużyny"
                style={inputStyle}
              />
            </label>

            <label>
              <strong>Typ</strong>

              <select
                value={eventForm.eventType}
                onChange={(event) =>
                  setEventForm({
                    ...eventForm,
                    eventType: event.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="zbiórka">
                  Zbiórka
                </option>

                <option value="wydarzenie">
                  Wydarzenie
                </option>

                <option value="służba">
                  Służba
                </option>

                <option value="wyjazd">
                  Wyjazd
                </option>

                <option value="biwak">
                  Biwak
                </option>

                <option value="rajd">
                  Rajd
                </option>

                <option value="zawody">
                  Zawody
                </option>

                <option value="inne">
                  Inne
                </option>
              </select>
            </label>

            <label>
              <strong>Dla kogo?</strong>

              <select
                value={eventForm.audience}
                onChange={(event) =>
                  setEventForm({
                    ...eventForm,
                    audience: event.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="whole">
                  Cała drużyna
                </option>

                <option value="patrol">
                  Konkretny zastęp
                </option>
              </select>
            </label>

            {eventForm.audience === "patrol" && (
              <label>
                <strong>Zastęp</strong>

                <select
                  value={eventForm.patrolId}
                  onChange={(event) =>
                    setEventForm({
                      ...eventForm,
                      patrolId: event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {patrols.map((patrol) => (
                    <option
                      key={patrol.id}
                      value={patrol.id}
                    >
                      {patrol.name} —{" "}
                      {patrol.leader_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <strong>Data</strong>

              <input
                type="date"
                value={eventForm.date}
                onChange={(event) =>
                  setEventForm({
                    ...eventForm,
                    date: event.target.value,
                  })
                }
                style={inputStyle}
              />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <label>
                <strong>Od</strong>

                <input
                  type="time"
                  step="1800"
                  value={eventForm.startTime}
                  onChange={(event) =>
                    setEventForm({
                      ...eventForm,
                      startTime: event.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                <strong>Do</strong>

                <input
                  type="time"
                  step="1800"
                  value={eventForm.endTime}
                  onChange={(event) =>
                    setEventForm({
                      ...eventForm,
                      endTime: event.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </label>
            </div>

            <label>
              <strong>Miejsce</strong>

              <select
                value={eventForm.location}
                onChange={(event) =>
                  setEventForm({
                    ...eventForm,
                    location: event.target.value,
                    customLocation:
                      event.target.value === "Inne"
                        ? eventForm.customLocation
                        : "",
                  })
                }
                style={inputStyle}
              >
                <option value="Nora">Nora</option>

                <option value="Basecamp">
                  Basecamp
                </option>

                <option value="Inne">
                  Inne miejsce...
                </option>
              </select>
            </label>

            {eventForm.location === "Inne" && (
              <label>
                <strong>Wpisz miejsce</strong>

                <input
                  type="text"
                  value={eventForm.customLocation}
                  onChange={(event) =>
                    setEventForm({
                      ...eventForm,
                      customLocation:
                        event.target.value,
                    })
                  }
                  placeholder="np. Olszynki, Orlik, las Zamość..."
                  style={inputStyle}
                />
              </label>
            )}

            <label>
              <strong>Opis</strong>

              <textarea
                value={eventForm.description}
                onChange={(event) =>
                  setEventForm({
                    ...eventForm,
                    description: event.target.value,
                  })
                }
                placeholder="Co robimy? Najważniejsze informacje..."
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </label>

            <label>
              <strong>Co zabrać?</strong>

              <textarea
                value={eventForm.bring}
                onChange={(event) =>
                  setEventForm({
                    ...eventForm,
                    bring: event.target.value,
                  })
                }
                placeholder="np. mundur, latarka, woda..."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </label>

            {isAdmin && (
              <div
                style={{
                  ...cardStyle,
                  background: "#faf8f0",
                  boxShadow: "none",
                  border: "1px solid #e5dfcc",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={eventForm.hasPayment}
                    onChange={(event) =>
                      setEventForm({
                        ...eventForm,
                        hasPayment:
                          event.target.checked,
                        cost: event.target.checked
                          ? eventForm.cost
                          : "",
                        paymentDeadline:
                          event.target.checked
                            ? eventForm.paymentDeadline
                            : "",
                      })
                    }
                    style={{
                      width: 19,
                      height: 19,
                    }}
                  />

                  <div>
                    <strong>Dodać płatność?</strong>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#68736d",
                        marginTop: 3,
                      }}
                    >
                      Włącz tylko wtedy, gdy to
                      wydarzenie jest płatne.
                    </div>
                  </div>
                </label>

                {eventForm.hasPayment && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: 10,
                      marginTop: 15,
                    }}
                  >
                    <label>
                      <strong>Kwota</strong>

                      <input
                        type="text"
                        value={eventForm.cost}
                        onChange={(event) =>
                          setEventForm({
                            ...eventForm,
                            cost: event.target.value,
                          })
                        }
                        placeholder="np. 35 zł"
                        style={inputStyle}
                      />
                    </label>

                    <label>
                      <strong>
                        Termin płatności
                      </strong>

                      <input
                        type="date"
                        value={
                          eventForm.paymentDeadline
                        }
                        onChange={(event) =>
                          setEventForm({
                            ...eventForm,
                            paymentDeadline:
                              event.target.value,
                          })
                        }
                        style={inputStyle}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 9,
              }}
            >
              <button
                style={secondaryStyle}
                disabled={eventSaving}
                onClick={() =>
                  setEventModalOpen(false)
                }
              >
                Anuluj
              </button>

              <button
                style={{
                  ...primaryStyle,
                  opacity: eventSaving ? 0.6 : 1,
                }}
                disabled={eventSaving}
                onClick={saveEvent}
              >
                {eventSaving
                  ? "Zapisuję..."
                  : "Dodaj wydarzenie"}
              </button>
            </div>
          </div>
        </ModalBackground>
      )}

      {eventDetails && (
        <ModalBackground
          close={() => setEventDetails(null)}
        >
          <div style={eyebrowStyle}>
            {eventTypeLabel(eventDetails.event_type).toUpperCase()}
            {" • "}
            {eventDetails.whole_troop
              ? "CAŁA DRUŻYNA"
              : "WYDARZENIE ZASTĘPU"}
          </div>

          {isTripType(eventDetails.event_type) && (
            <div
              style={{
                display: "inline-block",
                marginTop: 9,
                background: "#edf2ee",
                color: "#42604f",
                borderRadius: 20,
                padding: "7px 10px",
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              {tripCountdownLabel(eventDetails.event_date)}
            </div>
          )}

          <h2 style={{ marginBottom: 8 }}>
            {eventDetails.title}
          </h2>

          <div
            style={{
              lineHeight: 1.8,
              color: "#526159",
            }}
          >
            📅 {formatDate(eventDetails.event_date)}
            <br />

            🕐 {normalizeTime(
              eventDetails.start_time
            )}
            {eventDetails.end_time
              ? `–${normalizeTime(
                  eventDetails.end_time
                )}`
              : ""}
            <br />

            📍 {eventDetails.location}
          </div>

          {eventDetails.description && (
            <div
              style={{
                ...cardStyle,
                boxShadow: "none",
                background: "#edf1ed",
                marginTop: 16,
              }}
            >
              <strong>Informacje</strong>

              <p
                style={{
                  marginBottom: 0,
                  lineHeight: 1.6,
                }}
              >
                {eventDetails.description}
              </p>
            </div>
          )}

          {eventDetails.what_to_bring && (
            <div
              style={{
                ...cardStyle,
                boxShadow: "none",
                marginTop: 12,
              }}
            >
              <strong>🎒 Co zabrać?</strong>

              <p
                style={{
                  marginBottom: 0,
                  lineHeight: 1.6,
                }}
              >
                {eventDetails.what_to_bring}
              </p>
            </div>
          )}

          {eventDetails.cost && (
            <div
              style={{
                ...cardStyle,
                boxShadow: "none",
                background: "#fff9e9",
                border: "1px solid #ead8a7",
                marginTop: 12,
              }}
            >
              <div style={eyebrowStyle}>
                PŁATNOŚĆ
              </div>

              <h3
                style={{
                  margin: "6px 0",
                  fontSize: 21,
                }}
              >
                {eventDetails.cost}
              </h3>

              {eventDetails.payment_deadline && (
                <div style={{ color: "#6d6041" }}>
                  Termin:{" "}
                  {formatDate(
                    eventDetails.payment_deadline
                  )}
                </div>
              )}

              {isAdmin && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: "#756b53",
                  }}
                >
                  Statusy „zapłacone / nie
                  zapłacone” pojawią się tutaj po
                  dodaniu członków drużyny do
                  aplikacji.
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                isAdmin ? "1fr 1fr" : "1fr",
              gap: 9,
              marginTop: 18,
            }}
          >
            <button
              style={secondaryStyle}
              onClick={() => setEventDetails(null)}
            >
              Zamknij
            </button>

            {isAdmin && (
              <button
                style={primaryStyle}
                onClick={() =>
                  deleteEvent(eventDetails)
                }
              >
                Usuń wydarzenie
              </button>
            )}
          </div>
        </ModalBackground>
      )}

      {modalOpen && (
        <ModalBackground
          close={() =>
            !saving && setModalOpen(false)
          }
        >
          <h2 style={{ marginTop: 0 }}>
            Nowa rezerwacja
          </h2>

          <p
            style={{
              color: "#69746d",
              marginTop: -8,
            }}
          >
            {formatDate(selectedDate)}
          </p>

          <div style={{ display: "grid", gap: 15 }}>
            <label>
              <strong>Kto rezerwuje?</strong>
              <select
                value={form.reserver}
                onChange={(event) =>
                  handleReservationAudienceChange(event.target.value)
                }
                style={inputStyle}
              >
                <option value="whole">Cała drużyna</option>

                {patrols.map((patrol) => (
                  <option key={patrol.id} value={String(patrol.id)}>
                    {patrol.name} — {patrol.leader_name}
                  </option>
                ))}
              </select>

              <div
                style={{
                  fontSize: 12,
                  color: "#6d7771",
                  marginTop: 7,
                  lineHeight: 1.45,
                }}
              >
                {isAdmin
                  ? "Jako admin możesz rezerwować dla całej drużyny albo dowolnego zastępu."
                  : "„Cała drużyna” wymaga potwierdzenia uprawnień administratora. Pozostali rezerwują jako zastęp."}
              </div>
            </label>

            <label>
              <strong>Miejsce</strong>
              <select
                value={form.location}
                onChange={(event) =>
                  setForm({
                    ...form,
                    location: event.target.value,
                    customLocation: event.target.value === "Inne" ? form.customLocation : "",
                  })
                }
                style={inputStyle}
              >
                <option value="Nora">Nora</option>
                <option value="Basecamp">Basecamp</option>
                <option value="Inne">Inne miejsce...</option>
              </select>
            </label>

            {form.location === "Inne" && (
              <label>
                <strong>Wpisz miejsce</strong>
                <input
                  type="text"
                  value={form.customLocation}
                  onChange={(event) => setForm({ ...form, customLocation: event.target.value })}
                  placeholder="np. Orlik, Olszynki, szkoła..."
                  style={inputStyle}
                />
              </label>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>
                <strong>Od</strong>
                <select
                  value={form.startTime}
                  onChange={(event) => {
                    const startTime = event.target.value;
                    const endTime = form.endTime > startTime ? form.endTime : addMinutes(startTime, 30);
                    setForm({ ...form, startTime, endTime });
                  }}
                  style={inputStyle}
                >
                  {validTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </label>

              <label>
                <strong>Do</strong>
                <select
                  value={form.endTime}
                  onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                  style={inputStyle}
                >
                  {validTimes
                    .map((time) => addMinutes(time, 30))
                    .filter((time, index, array) => array.indexOf(time) === index && time > form.startTime)
                    .map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </label>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 9,
              }}
            >
              <button
                style={secondaryStyle}
                disabled={saving}
                onClick={() =>
                  setModalOpen(false)
                }
              >
                Anuluj
              </button>

              <button
                style={{
                  ...primaryStyle,
                  opacity: saving ? 0.6 : 1,
                }}
                disabled={saving}
                onClick={saveReservation}
              >
                {saving
                  ? "Zapisuję..."
                  : "Zapisz rezerwację"}
              </button>
            </div>
          </div>
        </ModalBackground>
      )}

      {detailsOpen && (
        <ModalBackground
          close={() => setDetailsOpen(null)}
        >
          <div style={eyebrowStyle}>Rezerwacja</div>

          <h2>{detailsOpen.patrol}</h2>

          <p style={{ lineHeight: 1.7 }}>
            <strong>
              {detailsOpen.time}–
              {detailsOpen.endTime ||
                addMinutes(detailsOpen.time, 30)}
            </strong>
            <br />
            📍 {detailsOpen.location}
            <br />
            👤{" "}
            {detailsOpen.leader ||
              "lider zastępu"}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 9,
            }}
          >
            <button
              style={secondaryStyle}
              onClick={() =>
                setDetailsOpen(null)
              }
            >
              Zamknij
            </button>

            <button
              style={primaryStyle}
              onClick={() =>
                removeReservation(detailsOpen)
              }
            >
              Anuluj rezerwację
            </button>
          </div>
        </ModalBackground>
      )}
    </main>
  );
}
function LoginScreen({
  email,
  setEmail,
  password,
  setPassword,
  login,
  error,
  loggingIn,
  signupMode,
  setSignupMode,
  signupName,
  setSignupName,
  signupMessage,
  register,
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #102a20, #214c38)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "Inter, Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#f5f3eb",
          borderRadius: 26,
          padding: "32px 25px",
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            color: "#8b2635",
            fontWeight: 900,
            letterSpacing: 2,
            fontSize: 12,
          }}
        >
          5 WDH • CZERWONE BERETY
        </div>

        <h1 style={{ color: "#17231c", marginBottom: 5 }}>
          Centrum Dowodzenia
        </h1>

        <p
          style={{
            color: "#68736d",
            marginTop: 0,
            marginBottom: 25,
          }}
        >
          {signupMode
            ? "Załóż konto. Po rejestracji admin przypisze Ci zastęp i uprawnienia."
            : "Zaloguj się do swojej części drużyny."}
        </p>

        <form
          onSubmit={signupMode ? register : login}
          style={{ display: "grid", gap: 15 }}
        >
          {signupMode && (
            <label>
              <strong>Imię i nazwisko</strong>

              <input
                type="text"
                required
                value={signupName}
                onChange={(event) =>
                  setSignupName(event.target.value)
                }
                style={inputStyle}
              />
            </label>
          )}

          <label>
            <strong>E-mail</strong>

            <input
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              style={inputStyle}
            />
          </label>

          <label>
            <strong>Hasło</strong>

            <input
              type="password"
              required
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              style={inputStyle}
            />
          </label>

          {signupMessage && (
            <div
              style={{
                background: "#eaf3ec",
                color: "#315843",
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
              }}
            >
              {signupMessage}
            </div>
          )}

          {error && (
            <div
              style={{
                background: "#f8e5e7",
                color: "#812638",
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loggingIn}
            style={{
              ...primaryStyle,
              padding: 14,
              fontSize: 15,
              opacity: loggingIn ? 0.6 : 1,
            }}
          >
            {loggingIn
              ? "Proszę czekać..."
              : signupMode
              ? "Załóż konto"
              : "Zaloguj się"}
          </button>

          <button
            type="button"
            onClick={() => {
              setSignupMode(!signupMode);
              setLoginError("");
            }}
            style={{
              ...secondaryStyle,
              width: "100%",
            }}
          >
            {signupMode
              ? "Mam już konto — zaloguj się"
              : "Nie mam konta — załóż konto"}
          </button>
        </form>
      </div>
    </main>
  );
}

function ParentApp({ logout }) {
  const [tab, setTab] = useState("Moje");

  return (
    <main style={appStyle}>
      <AppHeader
        subtitle="Strefa rodzica"
        logout={logout}
      />

      <section style={containerPadding}>
        {tab === "Moje" && (
          <>
            <div style={eyebrowStyle}>
              Najważniejsze informacje
            </div>

            <h2 style={{ marginTop: 5 }}>
              Co, kiedy i gdzie?
            </h2>

            <div style={{ display: "grid", gap: 12 }}>
              {PARENT_EVENTS.map((event) => (
                <div
                  key={event.id}
                  style={{
                    ...cardStyle,
                    borderLeft: "5px solid #8b2635",
                  }}
                >
                  <div style={eyebrowStyle}>
                    {event.type}
                  </div>

                  <h3>{event.title}</h3>

                  <div style={{ lineHeight: 1.7 }}>
                    📅 {formatDate(event.date)}
                    <br />
                    🕐 {event.time}
                    <br />
                    📍 {event.location}
                    <br />
                    🎒 {event.bring}

                    {event.cost && (
                      <>
                        <br />
                        💰 {event.cost}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "Kalendarz" && (
          <SimplePage
            title="Kalendarz"
            text="Tutaj będą wydarzenia przypisane do dziecka i jego zastępu."
          />
        )}

        {tab === "Dokumenty" && (
          <SimplePage
            title="Dokumenty"
            text="Tutaj będą zgody, regulaminy i informacje organizacyjne."
          />
        )}
      </section>

      <BottomNav
        tabs={["Moje", "Kalendarz", "Dokumenty"]}
        activeTab={tab}
        setActiveTab={setTab}
      />
    </main>
  );
}

function MonthlyCalendar({
  calendarDays,
  monthName,
  selectedDate,
  reservations,
  changeMonth,
  selectCalendarDay,
}) {
  return (
    <div
      style={{
        ...cardStyle,
        marginBottom: 22,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <button
          style={secondaryStyle}
          onClick={() => changeMonth(-1)}
        >
          ←
        </button>

        <strong
          style={{
            textTransform: "capitalize",
            fontSize: 18,
          }}
        >
          {monthName}
        </strong>

        <button
          style={secondaryStyle}
          onClick={() => changeMonth(1)}
        >
          →
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          textAlign: "center",
        }}
      >
        {[
          "Pon",
          "Wt",
          "Śr",
          "Czw",
          "Pt",
          "Sob",
          "Nd",
        ].map((day) => (
          <div
            key={day}
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#78827c",
              padding: 5,
            }}
          >
            {day}
          </div>
        ))}

        {calendarDays.map((date, index) => {
          if (!date) {
            return (
              <div
                key={`empty-${index}`}
                style={{ minHeight: 55 }}
              />
            );
          }

          const value = dateToString(date);
          const selected = value === selectedDate;

          const items = reservations.filter(
            (item) => item.date === value
          );

          const nora = items.some(
            (item) => item.location === "Nora"
          );

          const basecamp = items.some(
            (item) => item.location === "Basecamp"
          );

          const other = items.some(
            (item) =>
              !MAIN_LOCATIONS.includes(item.location)
          );

          return (
            <button
              key={value}
              onClick={() => selectCalendarDay(date)}
              style={{
                border: 0,
                background: selected
                  ? "#173b2b"
                  : "transparent",
                color: selected
                  ? "white"
                  : "#17231c",
                borderRadius: 14,
                minHeight: 55,
                cursor: "pointer",
                fontWeight: selected ? 900 : 600,
              }}
            >
              {date.getDate()}

              <div
                style={{
                  height: 7,
                  display: "flex",
                  gap: 3,
                  justifyContent: "center",
                  marginTop: 4,
                }}
              >
                {nora && (
                  <Dot
                    color={
                      selected
                        ? "#f1a5ae"
                        : "#9d293b"
                    }
                  />
                )}

                {basecamp && (
                  <Dot
                    color={
                      selected
                        ? "#bcd3b2"
                        : "#607b54"
                    }
                  />
                )}

                {other && (
                  <Dot
                    color={
                      selected
                        ? "#f3d899"
                        : "#b98a2f"
                    }
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          borderTop: "1px solid #edf0ed",
          marginTop: 15,
          paddingTop: 12,
          display: "flex",
          gap: 17,
          fontSize: 11,
          color: "#68736d",
          flexWrap: "wrap",
        }}
      >
        <LegendDot
          color="#9d293b"
          label="Nora"
        />

        <LegendDot
          color="#607b54"
          label="Basecamp"
        />

        <LegendDot
          color="#b98a2f"
          label="Inne miejsce"
        />
      </div>
    </div>
  );
}

function AppHeader({ subtitle, logout }) {
  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 15,
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 2.2,
                opacity: 0.72,
                fontWeight: 700,
              }}
            >
              5 WDH • CZERWONE BERETY
            </div>

            <h1
              style={{
                margin: "7px 0 5px",
                fontSize: 30,
              }}
            >
              Centrum Dowodzenia
            </h1>

            <div style={{ opacity: 0.75 }}>
              {subtitle}
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              border:
                "1px solid rgba(255,255,255,.3)",
              background:
                "rgba(255,255,255,.08)",
              color: "white",
              borderRadius: 11,
              padding: "8px 10px",
              cursor: "pointer",
            }}
          >
            Wyloguj
          </button>
        </div>
      </div>
    </header>
  );
}

function BottomNav({
  tabs,
  activeTab,
  setActiveTab,
}) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(255,255,255,.97)",
        borderTop: "1px solid #dde1dd",
        display: "flex",
        justifyContent: "space-around",
        zIndex: 50,
        padding: "11px 3px 14px",
        boxShadow:
          "0 -5px 18px rgba(0,0,0,.04)",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          style={{
            border: 0,
            background: "transparent",
            color:
              activeTab === tab
                ? "#8b2635"
                : "#68736d",
            fontWeight:
              activeTab === tab ? 800 : 500,
            cursor: "pointer",
            padding: "6px 8px",
          }}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}

function ModalBackground({ children, close }) {
  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,20,15,.58)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(event) =>
          event.stopPropagation()
        }
        style={{
          background: "#f7f6f1",
          width: "100%",
          maxWidth: 600,
          borderRadius: "26px 26px 0 0",
          padding: "23px 18px 28px",
          boxSizing: "border-box",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function MoreMenuButton({
  icon,
  title,
  subtitle,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...cardStyle,
        border: 0,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        color: "#17231c",
        display: "flex",
        alignItems: "center",
        gap: 13,
      }}
    >
      <span
        style={{
          fontSize: 24,
          width: 38,
          textAlign: "center",
        }}
      >
        {icon}
      </span>

      <span style={{ flex: 1 }}>
        <strong style={{ fontSize: 16 }}>{title}</strong>
        <span
          style={{
            display: "block",
            marginTop: 4,
            color: "#6b756f",
            fontSize: 12,
          }}
        >
          {subtitle}
        </span>
      </span>

      <span style={{ color: "#8b2635" }}>→</span>
    </button>
  );
}

function MiniStat({ value, label }) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: 13,
        textAlign: "center",
        boxShadow: "none",
        border: "1px solid #e0e4e0",
      }}
    >
      <div
        style={{
          fontSize: 22,
          lineHeight: 1,
          fontWeight: 900,
          color: "#173b2b",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 6,
          color: "#6b756f",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function SimplePage({ title, text }) {
  return (
    <>
      <h2>{title}</h2>

      <div style={cardStyle}>
        <p
          style={{
            color: "#69746d",
            margin: 0,
          }}
        >
          {text}
        </p>
      </div>
    </>
  );
}

function Dot({ color }) {
  return (
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
      }}
    />
  );
}

function LegendDot({ color, label }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Dot color={color} />
      {label}
    </span>
  );
}

const appStyle = {
  minHeight: "100vh",
  background: "#f2f0e7",
  color: "#17231c",
  fontFamily:
    "Inter, Arial, Helvetica, sans-serif",
  paddingBottom: 90,
};

const headerStyle = {
  background:
    "linear-gradient(135deg, #122d22 0%, #214c38 100%)",
  color: "white",
  padding: "28px 20px 32px",
  borderRadius: "0 0 30px 30px",
};

const containerStyle = {
  maxWidth: 900,
  margin: "0 auto",
};

const containerPadding = {
  ...containerStyle,
  padding: "22px 15px",
};

const eyebrowStyle = {
  textTransform: "uppercase",
  fontSize: 12,
  fontWeight: 800,
  color: "#68746d",
  letterSpacing: 1,
};

const centerScreen = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f2f0e7",
  color: "#173b2b",
  fontFamily:
    "Inter, Arial, Helvetica, sans-serif",
};
