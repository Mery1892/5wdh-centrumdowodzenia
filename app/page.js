"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

const VAPID_PUBLIC_KEY = "BFgs3cj7ghz3zLXNiy8bt6I2GOA3MPuZ6N0fByYAV8eSCc34hE8h00duN1hQL-Ii0IHUHAS980TZqFwa9hCn_UU";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((character) => character.charCodeAt(0))
  );
}

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
  const value = normalizeRole(role);

  return [
    "admin",
    "administrator",
    "administratorka",
    "drużynowa",
    "druzynowa",
  ].includes(value);
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

function approvalStatusLabel(status) {
  if (status === "pending") return "OCZEKUJE";
  if (status === "rejected") return "ODRZUCONA";
  return "ZATWIERDZONA";
}

function assignmentTypeLabel(type) {
  if (type === "representation") return "reprezentacja";
  if (type === "staff") return "kadra";
  return "uczestnik";
}

function quarterForDate(date = new Date()) {
  return Math.floor(date.getMonth() / 3) + 1;
}

function quarterLabel(quarter) {
  return `${["I", "II", "III", "IV"][Number(quarter) - 1] || quarter} kwartał`;
}

function roleLabel(role) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "Administrator";
  if (normalized === "parent") return "Rodzic";
  return "Harcerz / członek";
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
  const [currentProfile, setCurrentProfile] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState("Grafik");

  const [selectedDate, setSelectedDate] = useState("2026-09-26");
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(8);

  const [locationFilter, setLocationFilter] = useState("Nora");

  const [patrols, setPatrols] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);

  const [events, setEvents] = useState([]);
  const [eventAssignments, setEventAssignments] = useState([]);
  const [eventSignups, setEventSignups] = useState([]);
  const [eventAnnouncements, setEventAnnouncements] = useState([]);
  const [eventMessages, setEventMessages] = useState([]);
  const [eventAnnouncementTitle, setEventAnnouncementTitle] = useState("");
  const [eventAnnouncementBody, setEventAnnouncementBody] = useState("");
  const [eventMessageText, setEventMessageText] = useState("");
  const [eventCommunitySaving, setEventCommunitySaving] = useState(false);
  const [assignmentEditorEvent, setAssignmentEditorEvent] = useState(null);
  const [assignmentDraft, setAssignmentDraft] = useState({});
  const [assignmentSignupEnabled, setAssignmentSignupEnabled] = useState(false);
  const [assignmentSignupDeadline, setAssignmentSignupDeadline] = useState("");
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [signupSavingId, setSignupSavingId] = useState(null);
  const [myPatrolIds, setMyPatrolIds] = useState([]);

  const [tasks, setTasks] = useState([]);
  const [taskChatTask, setTaskChatTask] = useState(null);
  const [taskMessages, setTaskMessages] = useState([]);
  const [taskMessageText, setTaskMessageText] = useState("");
  const [taskMessageSaving, setTaskMessageSaving] = useState(false);

  const [people, setPeople] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pushStatus, setPushStatus] = useState("unknown");
  const [pushBusy, setPushBusy] = useState(false);
  const [membershipDues, setMembershipDues] = useState([]);
  const [duesSaving, setDuesSaving] = useState(false);
  const [parentChildren, setParentChildren] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentAdminFilter, setDocumentAdminFilter] = useState("all");
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [documentSaving, setDocumentSaving] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    title: "",
    description: "",
    audienceType: "members",
    patrolId: "",
    targetUserId: "",
    file: null,
  });
  const [duesViewYear, setDuesViewYear] = useState(new Date().getFullYear());
  const [adminDueYear, setAdminDueYear] = useState(new Date().getFullYear());
  const [adminDueQuarter, setAdminDueQuarter] = useState(quarterForDate());
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
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
    targetUserId: "",
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
    endDate: "",
    startTime: "17:30",
    endTime: "19:30",
    location: "Basecamp",
    customLocation: "",
    description: "",
    bring: "",
    hasPayment: false,
    cost: "",
    paymentDeadline: "",
    responsiblePersonId: "",
    selectedUserIds: [],
    signupEnabled: false,
    signupDeadline: "",
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
    if (session && role) {
      loadEvents();
      loadPeople();
      loadAnnouncements();
      loadNotifications();
      loadMembershipDues();
      loadParentChildren();
      loadDocuments();
      checkPushStatus();

      if (role !== "parent") {
        loadSchedule();
        loadTasks();
      }
    }
  }, [session, role]);

  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase
      .channel(`event-signups-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_signups",
        },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!eventDetails?.id || !canUseEventCommunity(eventDetails)) {
      setEventAnnouncements([]);
      setEventMessages([]);
      return;
    }

    loadEventCommunity(eventDetails.id);

    const channel = supabase
      .channel(`event-community-${eventDetails.id}-${session?.user?.id || "anon"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_announcements",
          filter: `event_id=eq.${eventDetails.id}`,
        },
        () => loadEventCommunity(eventDetails.id)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_messages",
          filter: `event_id=eq.${eventDetails.id}`,
        },
        () => loadEventCommunity(eventDetails.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventDetails?.id, session?.user?.id]);

  useEffect(() => {
    if (!taskChatTask?.id) return;

    const timer = window.setInterval(() => {
      loadTaskMessages(taskChatTask.id);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [taskChatTask?.id]);

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
      .select("id,role,name,full_name,function_title,is_staff,membership_number")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Błąd profilu:", error);
      setCurrentProfile(null);
      setRole("member");
      setLoading(false);
      return;
    }

    if (!data) {
      console.warn("Brak profilu dla zalogowanego użytkownika.");
      setCurrentProfile(null);
      setRole("member");
      setLoading(false);
      return;
    }

    setCurrentProfile(data);

    if (isAdminRole(data.role)) {
      setRole("admin");
    } else {
      setRole(normalizeRole(data.role) || "member");
    }

    setLoading(false);
  }

  async function verifyAdminAccess() {
    if (!session?.user?.id) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("id,role,name,full_name,function_title,is_staff,membership_number")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Nie udało się potwierdzić roli admina:", error);
      return isAdminRole(role) || isAdminRole(currentProfile?.role);
    }

    if (!data) return false;

    setCurrentProfile(data);

    const admin = isAdminRole(data.role);

    setRole(admin ? "admin" : normalizeRole(data.role) || "member");

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
        { data: requesterProfiles, error: requesterProfileError },
      ] = await Promise.all([
        supabase.from("patrols").select("id, name, leader_name, leader_id").order("id"),
        supabase
          .from("schedule_slots")
          .select("id, slot_date, start_time, end_time, location, notes, created_by, event_id")
          .order("slot_date")
          .order("start_time"),
        supabase
          .from("schedule_reservations")
          .select("id, slot_id, patrol_id, reserved_by, created_at, reservation_name, reservation_group, approval_status, approved_by, approved_at, rejection_reason, requester_name"),
        supabase
          .from("events")
          .select("id,title,event_date,start_time,end_time,location,created_by"),
        supabase
          .from("profiles")
          .select("id,name,full_name"),
      ]);

      if (patrolError) throw patrolError;
      if (slotError) throw slotError;
      if (reservationError) throw reservationError;
      if (scheduleEventError) throw scheduleEventError;
      if (requesterProfileError) throw requesterProfileError;

      const loadedPatrols = patrolData?.length > 0 ? patrolData : FALLBACK_PATROLS;
      setPatrols(loadedPatrols);

      const rawManual = (reservationData || [])
        .filter((reservation) => reservation.approval_status !== "rejected")
        .map((reservation) => {
          const slot = (slotData || []).find(
            (item) => Number(item.id) === Number(reservation.slot_id)
          );
          const patrol = (patrolData || []).find(
            (item) => Number(item.id) === Number(reservation.patrol_id)
          );
          const requester = (requesterProfiles || []).find(
            (item) => item.id === reservation.reserved_by
          );

          if (!slot) return null;

          return {
            id: reservation.id,
            slotId: slot.id,
            patrolId: reservation.patrol_id,
            reservedBy: reservation.reserved_by,
            reservationGroup: reservation.reservation_group,
            approvalStatus: reservation.approval_status || "approved",
            approvedBy: reservation.approved_by,
            approvedAt: reservation.approved_at,
            rejectionReason: reservation.rejection_reason,
            requesterName:
              reservation.requester_name ||
              requester?.full_name ||
              requester?.name ||
              "Użytkownik",
            date: slot.slot_date,
            time: normalizeTime(slot.start_time),
            endTime: normalizeTime(slot.end_time),
            location: slot.location,
            notes: slot.notes,
            patrol:
              reservation.reservation_name ||
              patrol?.name ||
              "Zastęp",
            leader:
              reservation.reservation_name === "Cała drużyna"
                ? "rezerwacja drużyny"
                : patrol?.leader_name || "",
            isEvent: false,
          };
        })
        .filter(Boolean);

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
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(
          "id,title,event_type,event_date,end_date,start_time,end_time,location,description,created_by,whole_troop,patrol_id,what_to_bring,cost,payment_deadline,responsible_person_id,signup_enabled,signup_deadline"
        )
        .order("event_date")
        .order("start_time");

      if (eventError) {
        console.error("Błąd głównej tabeli events:", eventError);
        alert(
          `Nie udało się pobrać wydarzeń.\n\n${eventError.message || ""}`
        );
        return;
      }

      setEvents(eventData || []);

      const [
        membershipResult,
        assignmentResult,
        signupResult,
      ] = await Promise.all([
        supabase
          .from("patrol_members")
          .select("patrol_id")
          .eq("user_id", session.user.id),

        supabase
          .from("event_assignments")
          .select(
            "id,event_id,user_id,assignment_type,note,assigned_by,created_at"
          ),

        supabase
          .from("event_signups")
          .select(
            "id,event_id,user_id,status,note,admin_note,reviewed_by,reviewed_at,created_at,updated_at"
          ),
      ]);

      if (membershipResult.error) {
        console.warn(
          "Nie udało się pobrać członkostwa w zastępach:",
          membershipResult.error
        );
        setMyPatrolIds([]);
      } else {
        setMyPatrolIds(
          (membershipResult.data || []).map((item) =>
            Number(item.patrol_id)
          )
        );
      }

      if (assignmentResult.error) {
        console.warn(
          "Nie udało się pobrać składu wyjazdów:",
          assignmentResult.error
        );
        setEventAssignments([]);
      } else {
        setEventAssignments(assignmentResult.data || []);
      }

      if (signupResult.error) {
        console.warn(
          "Nie udało się pobrać zgłoszeń na wyjazdy:",
          signupResult.error
        );
        setEventSignups([]);
      } else {
        setEventSignups(signupResult.data || []);
      }
    } catch (error) {
      console.error("Błąd pobierania wydarzeń:", error);
      alert(
        `Nie udało się pobrać wydarzeń.\n\n${
          error?.message || "Nieznany błąd"
        }`
      );
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
      endDate: "",
      startTime: tripPreset ? "08:00" : "17:30",
      endTime: tripPreset ? "18:00" : "19:30",
      location: tripPreset ? "Inne" : "Basecamp",
      customLocation: "",
      description: "",
      bring: "",
      hasPayment: false,
      cost: "",
      paymentDeadline: "",
      responsiblePersonId: "",
      selectedUserIds: [],
      signupEnabled: false,
      signupDeadline: "",
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

    if (!eventForm.date) {
      alert("Uzupełnij datę rozpoczęcia.");
      return;
    }

    if (eventForm.endDate && eventForm.endDate < eventForm.date) {
      alert("Data zakończenia nie może być wcześniejsza niż rozpoczęcia.");
      return;
    }

    if (eventForm.endTime && !eventForm.startTime) {
      alert("Jeśli wpisujesz godzinę zakończenia, wpisz też godzinę rozpoczęcia.");
      return;
    }

    if (
      eventForm.startTime &&
      eventForm.endTime &&
      eventForm.endTime <= eventForm.startTime &&
      (!eventForm.endDate || eventForm.endDate === eventForm.date)
    ) {
      alert("Przy wydarzeniu jednodniowym godzina zakończenia musi być późniejsza niż rozpoczęcia.");
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

    if (
      eventForm.audience === "selected" &&
      eventForm.selectedUserIds.length === 0
    ) {
      alert("Wybierz przynajmniej jedną osobę, która jedzie.");
      return;
    }

    if (eventForm.hasPayment && !eventForm.cost.trim()) {
      alert("Wpisz kwotę płatności.");
      return;
    }

    setEventSaving(true);
    let createdEventId = null;

    try {
      const reservesRoom =
        MAIN_LOCATIONS.includes(finalLocation) &&
        Boolean(eventForm.startTime) &&
        Boolean(eventForm.endTime) &&
        (!eventForm.endDate || eventForm.endDate === eventForm.date);

      const starts = reservesRoom
        ? halfHourStarts(
            eventForm.startTime,
            eventForm.endTime
          )
        : [];

      if (reservesRoom) {
        const { data: existingSlots, error: existingError } = await supabase
          .from("schedule_slots")
          .select("id,start_time,location")
          .eq("slot_date", eventForm.date)
          .eq("location", finalLocation);

        if (existingError) {
          console.warn(
            "Nie udało się sprawdzić grafiku sali przed zapisem wydarzenia:",
            existingError
          );
        }

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
          end_date: eventForm.endDate || null,
          start_time: eventForm.startTime
            ? `${eventForm.startTime}:00`
            : null,
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
          signup_enabled:
            isTripType(eventForm.eventType) &&
            Boolean(eventForm.signupEnabled),
          signup_deadline:
            isTripType(eventForm.eventType) &&
            eventForm.signupEnabled &&
            eventForm.signupDeadline
              ? eventForm.signupDeadline
              : null,
          what_to_bring: eventForm.bring.trim() || null,
          cost: eventForm.hasPayment
            ? eventForm.cost.trim()
            : null,
          payment_deadline:
            eventForm.hasPayment && eventForm.paymentDeadline
              ? eventForm.paymentDeadline
              : null,
          responsible_person_id:
            eventForm.responsiblePersonId || null,
        })
        .select("id")
        .single();

      if (eventError) throw eventError;

      createdEventId = created.id;

      if (
        isTripType(eventForm.eventType) &&
        eventForm.audience === "selected" &&
        eventForm.selectedUserIds.length
      ) {
        const { error: assignmentError } = await supabase
          .from("event_assignments")
          .insert(
            eventForm.selectedUserIds.map((userId) => ({
              event_id: created.id,
              user_id: userId,
              assignment_type: "participant",
              assigned_by: session.user.id,
            }))
          );

        if (assignmentError) {
          console.warn(
            "Wydarzenie zapisano, ale nie udało się zapisać wybranego składu:",
            assignmentError
          );
          alert(
            `Wydarzenie zapisano, ale nie udało się zapisać listy wybranych osób.\n\n${assignmentError.message || ""}`
          );
        }
      }

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

        if (slotError) {
          console.warn(
            "Wydarzenie zapisano, ale nie udało się zarezerwować sali w Grafiku:",
            slotError
          );
          alert(
            `Wydarzenie zapisano, ale sala nie została dodana do Grafiku.\n\n${slotError.message || ""}`
          );
        }
      }

      await sendPush({
        kind: "event_update",
        title: `Nowe wydarzenie: ${eventForm.title.trim()}`,
        body: `${
          eventForm.endDate
            ? `${formatDate(eventForm.date)}–${formatDate(eventForm.endDate)}`
            : formatDate(eventForm.date)
        }${
          eventForm.startTime
            ? `, ${eventForm.startTime}${
                eventForm.endTime ? `–${eventForm.endTime}` : ""
              }`
            : ""
        }, ${finalLocation}`,
        target_user_ids:
          isTripType(eventForm.eventType) && eventForm.signupEnabled
            ? people
                .filter(
                  (person) =>
                    normalizeRole(person.role) !== "parent"
                )
                .map((person) => person.id)
            : eventForm.audience === "selected"
            ? eventForm.selectedUserIds
            : targetUsersForAudience(
                eventForm.audience,
                eventForm.patrolId
              ),
        link: isTripType(eventForm.eventType)
          ? `/?view=wyjazdy&event=${created.id}`
          : `/?view=moje&event=${created.id}`,
      });

      setEventModalOpen(false);

      await Promise.all([
        loadEvents(),
        loadSchedule(),
        loadNotifications(),
      ]);
    } catch (error) {
      console.error("Błąd zapisu wydarzenia:", error);

      if (createdEventId) {
        alert(
          `Wydarzenie zostało zapisane, ale nie udało się wykonać jednej z dodatkowych operacji (np. rezerwacji sali albo składu wyjazdu).\n\n${error?.message || ""}`
        );

        setEventModalOpen(false);
        await Promise.allSettled([
          loadEvents(),
          loadSchedule(),
          loadNotifications(),
        ]);
      } else {
        alert(
          `Nie udało się zapisać wydarzenia.\n\n${error?.message || ""}`
        );
      }
    } finally {
      setEventSaving(false);
    }
  }

  function canUseEventCommunity(eventItem) {
    if (!eventItem || !session?.user) return false;
    if (isAdmin) return true;
    if (eventItem.whole_troop) return true;

    if (
      eventItem.patrol_id &&
      myPatrolIds.includes(Number(eventItem.patrol_id))
    ) {
      return true;
    }

    if (
      eventAssignments.some(
        (item) =>
          Number(item.event_id) === Number(eventItem.id) &&
          item.user_id === session.user.id
      )
    ) {
      return true;
    }

    return eventSignups.some(
      (item) =>
        Number(item.event_id) === Number(eventItem.id) &&
        item.user_id === session.user.id &&
        item.status === "approved"
    );
  }

  async function loadEventCommunity(eventId) {
    if (!eventId) return;

    const [annResult, msgResult] = await Promise.all([
      supabase
        .from("event_announcements")
        .select("id,event_id,user_id,title,body,pinned,created_at,updated_at")
        .eq("event_id", eventId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false }),

      supabase
        .from("event_messages")
        .select("id,event_id,user_id,message,created_at,edited_at")
        .eq("event_id", eventId)
        .order("created_at"),
    ]);

    setEventAnnouncements(
      annResult.error ? [] : annResult.data || []
    );

    setEventMessages(
      msgResult.error ? [] : msgResult.data || []
    );

    if (annResult.error) {
      console.warn("Błąd ogłoszeń wydarzenia:", annResult.error);
    }

    if (msgResult.error) {
      console.warn("Błąd czatu wydarzenia:", msgResult.error);
    }
  }

  async function addEventAnnouncement() {
    if (!eventDetails || !session?.user) return;

    const title = eventAnnouncementTitle.trim();
    const body = eventAnnouncementBody.trim();

    if (!title || !body) {
      alert("Wpisz tytuł i treść ogłoszenia.");
      return;
    }

    setEventCommunitySaving(true);

    try {
      const { error } = await supabase
        .from("event_announcements")
        .insert({
          event_id: eventDetails.id,
          user_id: session.user.id,
          title,
          body,
        });

      if (error) throw error;

      setEventAnnouncementTitle("");
      setEventAnnouncementBody("");
      await loadEventCommunity(eventDetails.id);
    } catch (error) {
      alert(`Nie udało się dodać ogłoszenia.\n\n${error?.message || ""}`);
    } finally {
      setEventCommunitySaving(false);
    }
  }

  async function deleteEventAnnouncement(item) {
    if (!item?.id) return;
    if (item.user_id !== session?.user?.id && !isAdmin) return;
    if (!window.confirm("Usunąć to ogłoszenie?")) return;

    const { error } = await supabase
      .from("event_announcements")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert(`Nie udało się usunąć ogłoszenia.\n\n${error.message}`);
      return;
    }

    await loadEventCommunity(eventDetails.id);
  }

  async function sendEventMessage() {
    if (!eventDetails || !session?.user) return;

    const message = eventMessageText.trim();

    if (!message) return;

    setEventCommunitySaving(true);

    try {
      const { error } = await supabase
        .from("event_messages")
        .insert({
          event_id: eventDetails.id,
          user_id: session.user.id,
          message,
        });

      if (error) throw error;

      setEventMessageText("");
      await loadEventCommunity(eventDetails.id);
    } catch (error) {
      alert(`Nie udało się wysłać wiadomości.\n\n${error?.message || ""}`);
    } finally {
      setEventCommunitySaving(false);
    }
  }

  async function deleteEventMessage(item) {
    if (!item?.id) return;
    if (item.user_id !== session?.user?.id && !isAdmin) return;
    if (!window.confirm("Usunąć tę wiadomość?")) return;

    const { error } = await supabase
      .from("event_messages")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert(`Nie udało się usunąć wiadomości.\n\n${error.message}`);
      return;
    }

    await loadEventCommunity(eventDetails.id);
  }

  function signupsForEvent(eventId) {
    return eventSignups
      .filter((item) => Number(item.event_id) === Number(eventId))
      .map((item) => {
        const person = people.find(
          (profile) => profile.id === item.user_id
        );

        return {
          ...item,
          personName:
            person?.full_name ||
            person?.name ||
            "Użytkownik",
        };
      })
      .sort((a, b) =>
        a.personName.localeCompare(b.personName, "pl")
      );
  }

  function mySignupForEvent(eventId) {
    return eventSignups.find(
      (item) =>
        Number(item.event_id) === Number(eventId) &&
        item.user_id === session?.user?.id
    );
  }

  function signupStatusLabel(status) {
    if (status === "approved") return "ZATWIERDZONY";
    if (status === "rejected") return "ODRZUCONY";
    if (status === "withdrawn") return "WYCOFANY";
    return "OCZEKUJE";
  }

  async function setEventSignupOpen(eventItem, isOpen) {
    const admin = await verifyAdminAccess();

    if (!admin) return;

    setSignupSavingId(eventItem.id);

    try {
      const { error } = await supabase
        .from("events")
        .update({
          signup_enabled: Boolean(isOpen),
        })
        .eq("id", eventItem.id);

      if (error) throw error;

      setEventDetails((current) =>
        current && current.id === eventItem.id
          ? {
              ...current,
              signup_enabled: Boolean(isOpen),
            }
          : current
      );

      await loadEvents();
    } catch (error) {
      console.error("Błąd zmiany statusu zgłoszeń:", error);
      alert(
        `Nie udało się zmienić statusu zgłoszeń.\n\n${
          error?.message || ""
        }`
      );
    } finally {
      setSignupSavingId(null);
    }
  }

  async function submitEventSignup(eventItem) {
    if (!session?.user || !eventItem?.id) return;

    setSignupSavingId(eventItem.id);

    try {
      await supabase
        .from("event_signups")
        .delete()
        .eq("event_id", eventItem.id)
        .eq("user_id", session.user.id);

      const { error } = await supabase
        .from("event_signups")
        .insert({
          event_id: eventItem.id,
          user_id: session.user.id,
          status: "pending",
        });

      if (error) throw error;

      await loadEvents();
    } catch (error) {
      console.error("Błąd zgłoszenia na wydarzenie:", error);
      alert(
        `Nie udało się wysłać zgłoszenia.\n\n${
          error?.message || ""
        }`
      );
    } finally {
      setSignupSavingId(null);
    }
  }

  async function withdrawEventSignup(eventItem) {
    if (!session?.user || !eventItem?.id) return;

    if (!window.confirm("Wycofać swoje zgłoszenie?")) return;

    setSignupSavingId(eventItem.id);

    try {
      const { error } = await supabase
        .from("event_signups")
        .delete()
        .eq("event_id", eventItem.id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      await loadEvents();
    } catch (error) {
      console.error("Błąd wycofania zgłoszenia:", error);
      alert(
        `Nie udało się wycofać zgłoszenia.\n\n${
          error?.message || ""
        }`
      );
    } finally {
      setSignupSavingId(null);
    }
  }

  async function approveEventSignup(signup) {
    const admin = await verifyAdminAccess();

    if (!admin) return;

    setSignupSavingId(signup.id);

    try {
      const { error: signupError } = await supabase
        .from("event_signups")
        .update({
          status: "approved",
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", signup.id);

      if (signupError) throw signupError;

      const { error: assignmentError } = await supabase
        .from("event_assignments")
        .upsert(
          {
            event_id: signup.event_id,
            user_id: signup.user_id,
            assignment_type: "participant",
            assigned_by: session.user.id,
          },
          {
            onConflict: "event_id,user_id",
          }
        );

      if (assignmentError) throw assignmentError;

      await loadEvents();
    } catch (error) {
      console.error("Błąd akceptacji zgłoszenia:", error);
      alert(
        `Nie udało się zaakceptować zgłoszenia.\n\n${
          error?.message || ""
        }`
      );
    } finally {
      setSignupSavingId(null);
    }
  }

  async function rejectEventSignup(signup) {
    const admin = await verifyAdminAccess();

    if (!admin) return;

    setSignupSavingId(signup.id);

    try {
      const { error: signupError } = await supabase
        .from("event_signups")
        .update({
          status: "rejected",
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", signup.id);

      if (signupError) throw signupError;

      await supabase
        .from("event_assignments")
        .delete()
        .eq("event_id", signup.event_id)
        .eq("user_id", signup.user_id);

      await loadEvents();
    } catch (error) {
      console.error("Błąd odrzucenia zgłoszenia:", error);
      alert(
        `Nie udało się odrzucić zgłoszenia.\n\n${
          error?.message || ""
        }`
      );
    } finally {
      setSignupSavingId(null);
    }
  }

  function assignmentsForEvent(eventId) {
    return eventAssignments
      .filter((item) => Number(item.event_id) === Number(eventId))
      .map((item) => {
        const person = people.find((profile) => profile.id === item.user_id);

        return {
          ...item,
          personName:
            person?.full_name ||
            person?.name ||
            "Użytkownik",
        };
      })
      .sort((a, b) => a.personName.localeCompare(b.personName, "pl"));
  }

  function rosterLabel(eventId) {
    const roster = assignmentsForEvent(eventId);

    if (!roster.length) return "";

    if (roster.every((item) => item.assignment_type === "staff")) {
      return "WYJAZD KADROWY";
    }

    if (roster.some((item) => item.assignment_type === "representation")) {
      return "REPREZENTACJA";
    }

    return "WYZNACZONY SKŁAD";
  }

  function openAssignmentEditor(eventItem) {
    const draft = {};

    assignmentsForEvent(eventItem.id).forEach((item) => {
      draft[item.user_id] = item.assignment_type;
    });

    setAssignmentDraft(draft);
    setAssignmentSignupEnabled(Boolean(eventItem.signup_enabled));
    setAssignmentSignupDeadline(eventItem.signup_deadline || "");
    setAssignmentEditorEvent(eventItem);
  }

  async function saveAssignmentEditor() {
    if (!assignmentEditorEvent || !session?.user) return;

    const admin = await verifyAdminAccess();

    if (!admin) {
      alert("Tylko administrator może wyznaczać skład wyjazdu.");
      return;
    }

    setAssignmentSaving(true);

    try {
      const { error: eventSettingsError } = await supabase
        .from("events")
        .update({
          signup_enabled: assignmentSignupEnabled,
          signup_deadline:
            assignmentSignupEnabled && assignmentSignupDeadline
              ? assignmentSignupDeadline
              : null,
        })
        .eq("id", assignmentEditorEvent.id);

      if (eventSettingsError) throw eventSettingsError;

      const { error: deleteError } = await supabase
        .from("event_assignments")
        .delete()
        .eq("event_id", assignmentEditorEvent.id);

      if (deleteError) throw deleteError;

      const rows = Object.entries(assignmentDraft)
        .filter(([, type]) => Boolean(type))
        .map(([userId, type]) => ({
          event_id: assignmentEditorEvent.id,
          user_id: userId,
          assignment_type: type,
          assigned_by: session.user.id,
        }));

      if (rows.length) {
        const { error: insertError } = await supabase
          .from("event_assignments")
          .insert(rows);

        if (insertError) throw insertError;
      }

      setAssignmentEditorEvent(null);
      await loadEvents();
    } catch (error) {
      console.error("Błąd zapisu składu:", error);
      alert(`Nie udało się zapisać składu wyjazdu.\n\n${error?.message || ""}`);
    } finally {
      setAssignmentSaving(false);
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

  function applyAppLink(link, clearUrl = false) {
    if (typeof window === "undefined") return;

    try {
      const url = new URL(link || "/", window.location.origin);
      const view = (url.searchParams.get("view") || "").toLowerCase();
      const section = (url.searchParams.get("section") || "").toLowerCase();
      const date = url.searchParams.get("date");
      const eventId = url.searchParams.get("event");
      const taskId = url.searchParams.get("task");

      if (view === "grafik") {
        setActiveTab("Grafik");

        if (date) {
          setSelectedDate(date);
          const parsed = new Date(`${date}T12:00:00`);
          if (!Number.isNaN(parsed.getTime())) {
            setCalendarYear(parsed.getFullYear());
            setCalendarMonth(parsed.getMonth());
          }
        }
      }

      if (view === "moje") {
        setActiveTab("Moje");
      }

      if (view === "wyjazdy") {
        setActiveTab("Wyjazdy");
      }

      if (view === "zadania") {
        setActiveTab("Zadania");

        if (taskId) {
          const task = tasks.find(
            (item) => String(item.id) === String(taskId)
          );

          if (task) {
            setTaskChatTask(task);
            loadTaskMessages(task.id);
          }
        }
      }

      if (view === "more") {
        setActiveTab("Więcej");

        if (section === "announcements") setMoreSection("announcements");
        else if (section === "notifications") setMoreSection("notifications");
        else if (section === "profile") setMoreSection("profile");
        else if (section === "dues") setMoreSection("dues");
        else setMoreSection("menu");
      }

      if (eventId) {
        const found = events.find(
          (event) => String(event.id) === String(eventId)
        );

        if (found) setEventDetails(found);
      }

      if (clearUrl) {
        window.history.replaceState(
          {},
          "",
          window.location.pathname
        );
      }
    } catch (error) {
      console.error("Błąd otwierania linku aplikacji:", error);
    }
  }

  useEffect(() => {
    if (
      !session ||
      !role ||
      deepLinkHandled ||
      typeof window === "undefined"
    ) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const eventId = params.get("event");

    if (!view) {
      setDeepLinkHandled(true);
      return;
    }

    if (eventId && events.length === 0) {
      return;
    }

    applyAppLink(window.location.href, true);
    setDeepLinkHandled(true);
  }, [
    session,
    role,
    deepLinkHandled,
    events,
    tasks,
    announcements,
  ]);

  async function loadMembershipDues() {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("membership_dues")
      .select(
        "id,user_id,due_year,due_quarter,paid,paid_at,marked_by,note,created_at,updated_at"
      )
      .order("due_year", { ascending: false })
      .order("due_quarter", { ascending: false });

    if (error) {
      console.error("Błąd pobierania składek:", error);
      return;
    }

    setMembershipDues(data || []);
  }

  function dueFor(userId, year, quarter) {
    return membershipDues.find(
      (item) =>
        item.user_id === userId &&
        Number(item.due_year) === Number(year) &&
        Number(item.due_quarter) === Number(quarter)
    );
  }

  async function setDuePaid(userId, year, quarter, paid) {
    const admin = await verifyAdminAccess();

    if (!admin) {
      alert("Tylko administrator może zmieniać status składki.");
      return;
    }

    setDuesSaving(true);

    try {
      const row = {
        user_id: userId,
        due_year: Number(year),
        due_quarter: Number(quarter),
        paid: Boolean(paid),
        paid_at: paid ? new Date().toISOString() : null,
        marked_by: session.user.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("membership_dues")
        .upsert(row, {
          onConflict: "user_id,due_year,due_quarter",
        });

      if (error) throw error;

      await loadMembershipDues();
    } catch (error) {
      console.error("Błąd zapisu składki:", error);
      alert(
        `Nie udało się zmienić statusu składki.\n\n${
          error?.message || ""
        }`
      );
    } finally {
      setDuesSaving(false);
    }
  }

  async function openNotification(item) {
    await markNotificationRead(item);

    if (item?.link) {
      applyAppLink(item.link, false);
    }
  }

  async function loadParentChildren() {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("parent_children")
      .select("id,parent_id,child_id,created_at")
      .order("created_at");

    if (error) {
      console.error("Błąd pobierania powiązań rodzic-dziecko:", error);
      return;
    }

    setParentChildren(data || []);
  }

  async function loadDocuments() {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("documents")
      .select(
        "id,title,description,file_name,file_path,mime_type,file_size,audience_type,patrol_id,target_user_id,uploaded_by,created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Błąd pobierania dokumentów:", error);
      return;
    }

    setDocuments(data || []);
  }

  async function openDocument(documentItem) {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(documentItem.file_path, 120);

      if (error) throw error;

      if (!data?.signedUrl) {
        throw new Error("Nie udało się utworzyć linku do dokumentu.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Błąd otwierania dokumentu:", error);
      alert(`Nie udało się otworzyć dokumentu.\n\n${error?.message || ""}`);
    }
  }

  function openDocumentForm() {
    const myLeaderPatrols = patrols.filter(
      (patrol) => patrol.leader_id === session?.user?.id
    );

    setDocumentForm({
      title: "",
      description: "",
      audienceType: isAdmin ? "members" : "patrol",
      patrolId:
        !isAdmin && myLeaderPatrols[0]?.id
          ? String(myLeaderPatrols[0].id)
          : patrols[0]?.id
          ? String(patrols[0].id)
          : "",
      targetUserId: "",
      file: null,
    });

    setDocumentModalOpen(true);
  }

  async function saveDocument() {
    if (!session?.user) return;

    if (!documentForm.title.trim()) {
      alert("Wpisz nazwę dokumentu.");
      return;
    }

    if (!documentForm.file) {
      alert("Wybierz plik.");
      return;
    }

    const admin = await verifyAdminAccess();
    const leaderPatrols = patrols.filter(
      (patrol) => patrol.leader_id === session.user.id
    );

    const leaderPatrolIds = leaderPatrols.map((patrol) => Number(patrol.id));
    const selectedPatrolId = documentForm.patrolId
      ? Number(documentForm.patrolId)
      : null;

    if (!admin) {
      if (
        documentForm.audienceType !== "patrol" ||
        !selectedPatrolId ||
        !leaderPatrolIds.includes(selectedPatrolId)
      ) {
        alert("Zastępowy może wrzucać dokumenty wyłącznie dla własnego zastępu.");
        return;
      }
    }

    if (
      ["patrol", "patrol_leaders"].includes(documentForm.audienceType) &&
      !selectedPatrolId
    ) {
      alert("Wybierz zastęp.");
      return;
    }

    if (
      documentForm.audienceType === "user" &&
      !documentForm.targetUserId
    ) {
      alert("Wybierz użytkownika.");
      return;
    }

    setDocumentSaving(true);

    let uploadedPath = null;

    try {
      const safeFileName = documentForm.file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const unique = `${Date.now()}-${crypto.randomUUID()}`;
      const path = admin
        ? `admin/${unique}-${safeFileName}`
        : `patrol/${selectedPatrolId}/${unique}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, documentForm.file, {
          upsert: false,
          contentType:
            documentForm.file.type || "application/octet-stream",
        });

      if (uploadError) throw uploadError;

      uploadedPath = path;

      const { error: insertError } = await supabase
        .from("documents")
        .insert({
          title: documentForm.title.trim(),
          description: documentForm.description.trim() || null,
          file_name: documentForm.file.name,
          file_path: path,
          mime_type: documentForm.file.type || null,
          file_size: documentForm.file.size || null,
          audience_type: admin
            ? documentForm.audienceType
            : "patrol",
          patrol_id:
            ["patrol", "patrol_leaders"].includes(
              admin ? documentForm.audienceType : "patrol"
            )
              ? selectedPatrolId
              : null,
          target_user_id:
            admin && documentForm.audienceType === "user"
              ? documentForm.targetUserId
              : null,
          uploaded_by: session.user.id,
        });

      if (insertError) throw insertError;

      setDocumentModalOpen(false);
      await loadDocuments();
    } catch (error) {
      console.error("Błąd zapisu dokumentu:", error);

      if (uploadedPath) {
        await supabase.storage
          .from("documents")
          .remove([uploadedPath]);
      }

      alert(`Nie udało się dodać dokumentu.\n\n${error?.message || ""}`);
    } finally {
      setDocumentSaving(false);
    }
  }

  async function deleteDocument(documentItem) {
    const admin = await verifyAdminAccess();

    if (!admin) {
      alert("Usuwanie dokumentów jest dostępne dla administratora.");
      return;
    }

    if (!window.confirm(`Usunąć dokument „${documentItem.title}”?`)) {
      return;
    }

    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([documentItem.file_path]);

    if (storageError) {
      console.error("Błąd usuwania pliku:", storageError);
    }

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentItem.id);

    if (error) {
      alert(`Nie udało się usunąć dokumentu.\n\n${error.message}`);
      return;
    }

    await loadDocuments();
  }

  async function loadTaskMessages(taskId) {
    if (!taskId) return;

    const { data, error } = await supabase
      .from("task_messages")
      .select("id,task_id,user_id,message,created_at,edited_at")
      .eq("task_id", taskId)
      .order("created_at");

    if (error) {
      console.error("Błąd pobierania czatu:", error);
      return;
    }

    setTaskMessages(data || []);
  }

  async function openTaskChat(task) {
    setTaskChatTask(task);
    setTaskMessageText("");
    await loadTaskMessages(task.id);
  }

  async function sendTaskMessage() {
    if (!session?.user || !taskChatTask) return;

    const message = taskMessageText.trim();

    if (!message) return;

    setTaskMessageSaving(true);

    try {
      const { error } = await supabase
        .from("task_messages")
        .insert({
          task_id: taskChatTask.id,
          user_id: session.user.id,
          message,
        });

      if (error) throw error;

      setTaskMessageText("");
      await loadTaskMessages(taskChatTask.id);
    } catch (error) {
      console.error("Błąd wysyłania wiadomości:", error);
      alert(`Nie udało się wysłać wiadomości.\n\n${error?.message || ""}`);
    } finally {
      setTaskMessageSaving(false);
    }
  }

  async function deleteTaskMessage(message) {
    if (!message?.id) return;

    const mine = message.user_id === session?.user?.id;

    if (!mine && !isAdmin) {
      return;
    }

    if (!window.confirm("Usunąć tę wiadomość?")) return;

    const { error } = await supabase
      .from("task_messages")
      .delete()
      .eq("id", message.id);

    if (error) {
      alert(`Nie udało się usunąć wiadomości.\n\n${error.message}`);
      return;
    }

    await loadTaskMessages(taskChatTask.id);
  }

  async function loadNotifications() {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,body,link,read_at,created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error("Błąd pobierania powiadomień:", error);
      return;
    }

    setNotifications(data || []);
  }

  async function checkPushStatus() {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setPushStatus("unsupported");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        await registration.pushManager.getSubscription();

      if (subscription && Notification.permission === "granted") {
        setPushStatus("enabled");
      } else if (Notification.permission === "denied") {
        setPushStatus("blocked");
      } else {
        setPushStatus("disabled");
      }
    } catch (error) {
      console.error("Błąd sprawdzania push:", error);
      setPushStatus("disabled");
    }
  }

  async function enablePushNotifications() {
    if (!session?.user) return;

    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      alert("Ta przeglądarka nie obsługuje powiadomień push.");
      setPushStatus("unsupported");
      return;
    }

    setPushBusy(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setPushStatus(
          permission === "denied" ? "blocked" : "disabled"
        );
        alert("Nie udzielono zgody na powiadomienia.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = subscription.toJSON();

      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Nie udało się odczytać danych subskrypcji.");
      }

      const { data: existingRows, error: findError } = await supabase
        .from("push_subscriptions")
        .select("id,endpoint")
        .eq("user_id", session.user.id)
        .eq("endpoint", json.endpoint)
        .limit(1);

      if (findError) throw findError;

      if (!existingRows?.length) {
        const { error: insertError } = await supabase
          .from("push_subscriptions")
          .insert({
            user_id: session.user.id,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          });

        if (insertError) throw insertError;
      }

      setPushStatus("enabled");
      alert("Powiadomienia są włączone na tym urządzeniu.");
    } catch (error) {
      console.error("Błąd włączania powiadomień:", error);
      alert(
        `Nie udało się włączyć powiadomień.\n\n${
          error?.message || ""
        }`
      );
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePushNotifications() {
    if (!session?.user) return;

    setPushBusy(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;

        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", session.user.id)
          .eq("endpoint", endpoint);

        await subscription.unsubscribe();
      }

      setPushStatus("disabled");
    } catch (error) {
      console.error("Błąd wyłączania powiadomień:", error);
      alert("Nie udało się wyłączyć powiadomień.");
    } finally {
      setPushBusy(false);
    }
  }

  async function sendPush(body) {
    try {
      const { error } = await supabase.functions.invoke("send-push", {
        body,
      });

      if (error) {
        console.error("Błąd funkcji send-push:", error);
      }
    } catch (error) {
      console.error("Nie udało się wysłać push:", error);
    }
  }

  function targetUsersForAudience(
    audience,
    patrolId,
    targetUserId = ""
  ) {
    if (audience === "whole") {
      return people
        .filter(
          (person) =>
            normalizeRole(person.role) !== "parent"
        )
        .map((person) => person.id);
    }

    if (audience === "user") {
      return targetUserId ? [targetUserId] : [];
    }

    if (audience === "staff") {
      return people
        .filter(
          (person) =>
            person.is_staff ||
            Boolean(person.function_title?.trim()) ||
            isAdminRole(person.role)
        )
        .map((person) => person.id);
    }

    const memberIds = memberships
      .filter(
        (membership) =>
          Number(membership.patrol_id) === Number(patrolId)
      )
      .map((membership) => membership.user_id);

    const patrol = patrols.find(
      (item) => Number(item.id) === Number(patrolId)
    );

    if (patrol?.leader_id) memberIds.push(patrol.leader_id);

    return [...new Set(memberIds)];
  }

  async function markNotificationRead(notification) {
    if (!notification?.id || notification.read_at) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notification.id);

    if (!error) {
      setNotifications((old) =>
        old.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    }
  }

  async function loadPeople() {
    if (!session?.user) return;

    const [
      { data: profileData, error: profileError },
      { data: membershipData, error: membershipError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,role,name,full_name,function_title,is_staff,membership_number,created_at")
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
      const { data: createdAnnouncement, error } = await supabase
        .from("announcements")
        .insert({
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
        })
        .select("id")
        .single();

      if (error) throw error;

      await sendPush({
        kind: "announcement",
        title: announcementForm.important
          ? `WAŻNE: ${announcementForm.title.trim()}`
          : announcementForm.title.trim(),
        body: announcementForm.body.trim(),
        target_user_ids: targetUsersForAudience(
          announcementForm.audience,
          announcementForm.patrolId
        ),
        link: `/?view=more&section=announcements&announcement=${createdAnnouncement.id}`,
      });

      setAnnouncementModalOpen(false);
      await Promise.all([loadAnnouncements(), loadNotifications()]);
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
      functionMode: ["Przyboczny", "Zastępowy", "Podzastępowy"].includes(
        profile.function_title || ""
      )
        ? profile.function_title
        : profile.function_title
        ? "custom"
        : "",
      membershipNumber: profile.membership_number || "",
      isStaff: Boolean(profile.is_staff),
      patrolId: membership?.patrol_id ? String(membership.patrol_id) : "",
      leaderPatrolId: leaderPatrol?.id ? String(leaderPatrol.id) : "",
      childIds: parentChildren
        .filter((link) => link.parent_id === profile.id)
        .map((link) => link.child_id),
    });
  }

  async function saveUserEditor() {
    const admin = await verifyAdminAccess();
    if (!admin || !userEditor) return;

    if (!userEditor.fullName.trim()) {
      alert("Wpisz imię i nazwisko.");
      return;
    }

    if (
      userEditor.functionMode === "custom" &&
      !userEditor.functionTitle.trim()
    ) {
      alert("Wpisz własną nazwę funkcji.");
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
          membership_number:
            userEditor.membershipNumber.trim() || null,
          is_staff:
            userEditor.isStaff ||
            Boolean(userEditor.functionTitle.trim()),
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

      const { error: clearChildrenError } = await supabase
        .from("parent_children")
        .delete()
        .eq("parent_id", userEditor.id);

      if (clearChildrenError) throw clearChildrenError;

      if (
        userEditor.role === "parent" &&
        userEditor.childIds?.length
      ) {
        const { error: childrenError } = await supabase
          .from("parent_children")
          .insert(
            userEditor.childIds.map((childId) => ({
              parent_id: userEditor.id,
              child_id: childId,
            }))
          );

        if (childrenError) throw childrenError;
      }

      setUserEditor(null);

      await Promise.all([
        loadPeople(),
        loadSchedule(),
        loadMembershipDues(),
        loadParentChildren(),
        userEditor.id === session.user.id
          ? loadRole(session.user.id)
          : Promise.resolve(),
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
        "id,title,description,due_date,status,whole_troop,patrol_id,target_user_id,staff_only,created_by,created_at"
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
      targetUserId: "",
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

    if (taskForm.audience === "user" && !taskForm.targetUserId) {
      alert("Wybierz konkretną osobę.");
      return;
    }

    setTaskSaving(true);

    try {
      const { data: createdTask, error } = await supabase
        .from("tasks")
        .insert({
          title: taskForm.title.trim(),
          description: taskForm.description.trim() || null,
          due_date: taskForm.dueDate || null,
          status: "todo",
          whole_troop: taskForm.audience === "whole",
          patrol_id:
            taskForm.audience === "patrol"
              ? Number(taskForm.patrolId)
              : null,
          target_user_id:
            taskForm.audience === "user"
              ? taskForm.targetUserId
              : null,
          staff_only: taskForm.audience === "staff",
          created_by: session.user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      await sendPush({
        kind: "task",
        title: `Nowe zadanie: ${taskForm.title.trim()}`,
        body: taskForm.dueDate
          ? `Termin: ${formatDate(taskForm.dueDate)}`
          : taskForm.description.trim() || "Nowe zadanie drużyny.",
        target_user_ids: targetUsersForAudience(
          taskForm.audience,
          taskForm.patrolId,
          taskForm.targetUserId
        ),
        link: `/?view=zadania&task=${createdTask.id}`,
      });

      setTaskModalOpen(false);
      await Promise.all([loadTasks(), loadNotifications()]);
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
    setCurrentProfile(null);
    setReservations([]);
    setEvents([]);
    setEventAssignments([]);
    setEventSignups([]);
    setEventAnnouncements([]);
    setEventMessages([]);
    setTasks([]);
    setPeople([]);
    setMemberships([]);
    setAnnouncements([]);
    setNotifications([]);
    setMembershipDues([]);
    setParentChildren([]);
    setDocuments([]);
    setDocumentAdminFilter("all");
    setDocumentSearch("");
    setTaskMessages([]);
    setTaskChatTask(null);
    setPushStatus("unknown");
    setDeepLinkHandled(false);
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
    const admin = await verifyAdminAccess();

    if (wholeTroop && !admin) {
      alert("Tylko administrator może rezerwować dla całej drużyny.");
      return;
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
      const isOwnPatrolLeader =
        !wholeTroop &&
        patrol?.leader_id === session.user.id;
      const approvalStatus =
        admin || isOwnPatrolLeader
          ? "approved"
          : "pending";
      const requesterName =
        currentProfile?.full_name ||
        currentProfile?.name ||
        session.user.user_metadata?.full_name ||
        session.user.email?.split("@")[0] ||
        "Użytkownik";

      const { data: newReservations, error: reservationError } = await supabase
        .from("schedule_reservations")
        .insert(allSlots.map((slot) => ({
          slot_id: slot.id,
          patrol_id: wholeTroop ? null : patrol.id,
          reserved_by: session.user.id,
          reservation_name: reservationName,
          reservation_group: groupId,
          approval_status: approvalStatus,
          approved_by: approvalStatus === "approved" ? session.user.id : null,
          approved_at: approvalStatus === "approved" ? new Date().toISOString() : null,
          requester_name: requesterName,
        })))
        .select("id");

      if (reservationError) throw reservationError;
      createdReservationIds.push(...(newReservations || []).map((item) => item.id));

      setModalOpen(false);

      if (approvalStatus === "pending") {
        alert("Rezerwacja została wysłana do zatwierdzenia przez administratora.");

        await sendPush({
          kind: "reservation_pending",
          title: "Nowa rezerwacja do akceptacji",
          body: `${requesterName} rezerwuje ${reservationName}: ${formatDate(
            selectedDate
          )}, ${form.startTime}–${form.endTime}, ${finalLocation}.`,
          link: `/?view=grafik&date=${selectedDate}`,
        });
      } else {
        await sendPush({
          kind: "reservation_notice",
          whole_troop: wholeTroop,
          patrol_id: patrol?.id || null,
          requester_user_id: session.user.id,
          title: `Rezerwacja: ${reservationName}`,
          body: `${formatDate(selectedDate)}, ${form.startTime}–${
            form.endTime
          }, ${finalLocation}. Rezerwuje: ${requesterName}.`,
          link: `/?view=grafik&date=${selectedDate}`,
        });
      }

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

  async function approveReservation(reservation) {
    const admin = await verifyAdminAccess();

    if (!admin) {
      alert("Tylko administrator może zatwierdzać rezerwacje.");
      return;
    }

    const ids = reservation.reservationIds || [reservation.id];

    const { error } = await supabase
      .from("schedule_reservations")
      .update({
        approval_status: "approved",
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .in("id", ids);

    if (error) {
      alert(`Nie udało się zatwierdzić rezerwacji.\n\n${error.message}`);
      return;
    }

    await sendPush({
      kind: "reservation_notice",
      whole_troop: !reservation.patrolId,
      patrol_id: reservation.patrolId || null,
      requester_user_id: reservation.reservedBy,
      title: `Rezerwacja zatwierdzona: ${reservation.patrol}`,
      body: `${formatDate(reservation.date)}, ${reservation.time}–${
        reservation.endTime
      }, ${reservation.location}.`,
      link: `/?view=grafik&date=${reservation.date}`,
    });

    await loadSchedule();
  }

  async function rejectReservation(reservation) {
    const admin = await verifyAdminAccess();

    if (!admin) {
      alert("Tylko administrator może odrzucać rezerwacje.");
      return;
    }

    const reason = window.prompt(
      "Powód odrzucenia rezerwacji:",
      "Termin lub miejsce wymagają zmiany."
    );

    if (reason === null) return;

    const ids = reservation.reservationIds || [reservation.id];
    const slotIds = reservation.slotIds || [];

    const { error: statusError } = await supabase
      .from("schedule_reservations")
      .update({
        approval_status: "rejected",
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason.trim() || "Rezerwacja odrzucona przez administratora.",
      })
      .in("id", ids);

    if (statusError) {
      alert(`Nie udało się odrzucić rezerwacji.\n\n${statusError.message}`);
      return;
    }

    await sendPush({
      kind: "reservation_rejected",
      target_user_id: reservation.reservedBy,
      title: "Rezerwacja odrzucona",
      body: `${reservation.patrol}: ${formatDate(
        reservation.date
      )}, ${reservation.time}–${reservation.endTime}. Powód: ${
        reason.trim() ||
        "Rezerwacja odrzucona przez administratora."
      }`,
      link: `/?view=grafik&date=${reservation.date}`,
    });

    // Audit zapisuje status "rejected", a następnie zwalniamy termin.
    const { error: deleteError } = await supabase
      .from("schedule_reservations")
      .delete()
      .in("id", ids);

    if (deleteError) {
      alert(`Status zmieniono, ale nie udało się zwolnić terminu.\n\n${deleteError.message}`);
      await loadSchedule();
      return;
    }

    if (slotIds.length) {
      await supabase
        .from("schedule_slots")
        .delete()
        .in("id", slotIds);
    }

    await loadSchedule();
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
        setLoginError={setLoginError}
      />
    );
  }

  if (role === "parent") {
    return (
      <ParentApp
        logout={logout}
        events={events}
        eventAssignments={eventAssignments}
        people={people}
        patrols={patrols}
        memberships={memberships}
        parentChildren={parentChildren}
        membershipDues={membershipDues}
        announcements={announcements}
        documents={documents}
        currentUserId={session.user.id}
        openDocument={openDocument}
        pushStatus={pushStatus}
        pushBusy={pushBusy}
        enablePushNotifications={enablePushNotifications}
        disablePushNotifications={disablePushNotifications}
      />
    );
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
  const isAdmin =
    isAdminRole(role) ||
    isAdminRole(currentProfile?.role);

  const visibleEvents = events
    .filter((item) => item.event_date >= today)
    .filter((item) => {
      if (isAdmin) return true;
      if (item.whole_troop) return true;
      if (myPatrolIds.includes(Number(item.patrol_id))) return true;

      const assignedToMe = eventAssignments.some(
        (assignment) =>
          Number(assignment.event_id) === Number(item.id) &&
          assignment.user_id === session.user.id
      );

      if (assignedToMe) return true;

      const mySignup = eventSignups.find(
        (signup) =>
          Number(signup.event_id) === Number(item.id) &&
          signup.user_id === session.user.id
      );

      if (mySignup) return true;

      return Boolean(item.signup_enabled);
    });

  const ownReservations = reservations.filter(
    (item) =>
      !item.isEvent &&
      item.reservedBy === session.user.id &&
      item.date >= today
  );

  const pendingReservations = reservations
    .filter(
      (item) =>
        !item.isEvent &&
        item.approvalStatus === "pending"
    )
    .sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
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
    (person) =>
      person.is_staff ||
      Boolean(person.function_title?.trim()) ||
      isAdminRole(person.role)
  );

  const visibleTasks = tasks
    .filter((task) => {
      if (isAdmin) return true;
      if (task.whole_troop) return true;

      if (
        task.target_user_id &&
        task.target_user_id === session.user.id
      ) {
        return true;
      }

      if (task.staff_only) {
        return Boolean(
          currentProfile?.is_staff ||
            currentProfile?.function_title?.trim() ||
            isAdminRole(currentProfile?.role)
        );
      }

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
            ? "Panel administratora • ADMIN"
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

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {isAdmin && (
                  <button
                    style={{
                      ...secondaryStyle,
                      borderColor:
                        pendingReservations.length > 0
                          ? "#b98a2f"
                          : "#d6dbd6",
                    }}
                    onClick={() =>
                      setShowApprovalPanel(!showApprovalPanel)
                    }
                  >
                    Do akceptacji ({pendingReservations.length})
                  </button>
                )}

                <button
                  style={primaryStyle}
                  onClick={() => openReservation()}
                >
                  + Rezerwacja
                </button>
              </div>
            </div>

            {isAdmin && showApprovalPanel && (
              <div
                style={{
                  ...cardStyle,
                  marginBottom: 16,
                  border: "1px solid #ead8a7",
                  background: "#fffaf0",
                }}
              >
                <div style={eyebrowStyle}>ADMIN</div>
                <h3 style={{ margin: "5px 0 12px" }}>
                  Rezerwacje do akceptacji
                </h3>

                {pendingReservations.length === 0 ? (
                  <div style={{ color: "#6a746e" }}>
                    Wszystko zatwierdzone — brak oczekujących rezerwacji.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 9 }}>
                    {pendingReservations.map((reservation) => (
                      <div
                        key={`pending-${reservation.id}`}
                        style={{
                          background: "white",
                          borderRadius: 14,
                          padding: 13,
                          border: "1px solid #e8dfc9",
                        }}
                      >
                        <strong>{reservation.patrol}</strong>

                        <div
                          style={{
                            color: "#66726b",
                            fontSize: 13,
                            lineHeight: 1.6,
                            marginTop: 5,
                          }}
                        >
                          👤 {reservation.requesterName}
                          <br />
                          📅 {formatDate(reservation.date)}
                          <br />
                          🕐 {reservation.time}–{reservation.endTime}
                          <br />
                          📍 {reservation.location}
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 8,
                            marginTop: 10,
                          }}
                        >
                          <button
                            style={secondaryStyle}
                            onClick={() =>
                              rejectReservation(reservation)
                            }
                          >
                            Odrzuć
                          </button>

                          <button
                            style={primaryStyle}
                            onClick={() =>
                              approveReservation(reservation)
                            }
                          >
                            Zatwierdź
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                      : reservation.approvalStatus === "pending"
                      ? "5px solid #b98a2f"
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
                        : `Rezerwuje: ${reservation.requesterName}`}
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
                    {!reservation.isEvent &&
                      reservation.approvalStatus === "pending"
                      ? " • oczekuje"
                      : ""}
                  </span>
                </button>
              ))}
            </div>
            <h3 style={{ margin: "26px 0 10px" }}>
              Wolne terminy — {locationFilter}
            </h3>

            <div style={{ display: "grid", gap: 8 }}>
              {locationFilter !== "Inne" &&
                validTimes.map((time) => {
                  const location = locationFilter;

                  const occupied = reservations.some(
                    (item) =>
                      item.date === selectedDate &&
                      item.location === location &&
                      item.approvalStatus !== "rejected" &&
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
                })}

              {locationFilter === "Inne" && (
                <>
                  <div
                    style={{
                      ...cardStyle,
                      boxShadow: "none",
                      background: "#fffaf0",
                      border: "1px solid #ead8a7",
                      color: "#6f5722",
                      lineHeight: 1.55,
                    }}
                  >
                    Tutaj wybierasz godzinę, a konkretne miejsce wpisujesz
                    podczas rezerwacji — np. Olszynki, Orlik albo las.
                  </div>

                  {validTimes.map((time) => (
                    <div
                      key={`other-${time}`}
                      style={{
                        border: "2px dashed #b98a2f",
                        borderRadius: 16,
                        padding: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        background: "#fffdf7",
                      }}
                    >
                      <div>
                        <strong>
                          {time}–{addMinutes(time, 30)}
                        </strong>

                        <div
                          style={{
                            fontSize: 13,
                            color: "#72571e",
                            marginTop: 3,
                          }}
                        >
                          inne miejsce
                        </div>
                      </div>

                      <button
                        style={secondaryStyle}
                        onClick={() =>
                          openReservation(time, "Inne miejsce")
                        }
                      >
                        Wybierz miejsce
                      </button>
                    </div>
                  ))}
                </>
              )}
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
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 9,
                marginBottom: 18,
              }}
            >
              <MiniStat
                value={upcomingTrips.length}
                label="nadchodzące"
              />

              <MiniStat
                value={
                  upcomingTrips.filter(
                    (item) => item.event_type === "biwak"
                  ).length
                }
                label="biwaki"
              />

              <MiniStat
                value={
                  upcomingTrips.filter(
                    (item) => item.event_type === "rajd"
                  ).length
                }
                label="rajdy"
              />

              <MiniStat
                value={
                  upcomingTrips.filter(
                    (item) => item.event_type === "zawody"
                  ).length
                }
                label="zawody"
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
                              : patrol?.name ||
                                (assignmentsForEvent(trip.id).length
                                  ? "WYBRANI UCZESTNICY"
                                  : "WYDARZENIE")}
                          </div>

                          {rosterLabel(trip.id) && (
                            <div
                              style={{
                                display: "inline-block",
                                marginTop: 7,
                                background:
                                  rosterLabel(trip.id) === "WYJAZD KADROWY"
                                    ? "#173b2b"
                                    : "#8b2635",
                                color: "white",
                                borderRadius: 20,
                                padding: "5px 9px",
                                fontSize: 10,
                                fontWeight: 900,
                              }}
                            >
                              {rosterLabel(trip.id)}
                            </div>
                          )}

                          {trip.signup_enabled && (
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                                marginTop: 7,
                              }}
                            >
                              <span
                                style={{
                                  background: "#edf7ef",
                                  color: "#315d3e",
                                  borderRadius: 20,
                                  padding: "5px 8px",
                                  fontSize: 10,
                                  fontWeight: 900,
                                }}
                              >
                                JEDZIE {assignmentsForEvent(trip.id).length}
                              </span>

                              <span
                                style={{
                                  background: "#fff5d9",
                                  color: "#715818",
                                  borderRadius: 20,
                                  padding: "5px 8px",
                                  fontSize: 10,
                                  fontWeight: 900,
                                }}
                              >
                                CZEKA{" "}
                                {
                                  signupsForEvent(trip.id).filter(
                                    (signup) => signup.status === "pending"
                                  ).length
                                }
                              </span>
                            </div>
                          )}

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
                              : task.staff_only
                              ? "KADRA"
                              : task.target_user_id
                              ? `OSOBA: ${
                                  people.find(
                                    (person) =>
                                      person.id === task.target_user_id
                                  )?.full_name ||
                                  people.find(
                                    (person) =>
                                      person.id === task.target_user_id
                                  )?.name ||
                                  "Użytkownik"
                                }`
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

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 13,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          style={primaryStyle}
                          onClick={() => openTaskChat(task)}
                        >
                          💬 Czat
                        </button>

                      {isAdmin && (
                        <>
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
                    icon="🔔"
                    title="Powiadomienia"
                    subtitle={
                      pushStatus === "enabled"
                        ? `${notifications.filter((item) => !item.read_at).length} nieprzeczytanych • push włączony`
                        : `${notifications.filter((item) => !item.read_at).length} nieprzeczytanych • włącz push`
                    }
                    onClick={() => setMoreSection("notifications")}
                  />

                  <MoreMenuButton
                    icon="👤"
                    title="Mój profil"
                    subtitle={
                      currentProfile?.membership_number
                        ? `nr ewidencji ${currentProfile.membership_number}`
                        : "dane członka drużyny"
                    }
                    onClick={() => setMoreSection("profile")}
                  />

                  <MoreMenuButton
                    icon="💳"
                    title="Składka członkowska"
                    subtitle={`${quarterLabel(
                      quarterForDate()
                    )} ${new Date().getFullYear()} • ${
                      dueFor(
                        session.user.id,
                        new Date().getFullYear(),
                        quarterForDate()
                      )?.paid
                        ? "opłacona"
                        : "nieopłacona"
                    }`}
                    onClick={() => setMoreSection("dues")}
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
                    subtitle={`${documents.length} plików dostępnych dla Ciebie`}
                    onClick={() => setMoreSection("documents")}
                  />
                </div>
              </>
            )}

            {moreSection === "documents" && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={eyebrowStyle}>
                      {isAdmin ? "PANEL ADMINA • PLIKI DRUŻYNY" : "PLIKI DRUŻYNY"}
                    </div>
                    <h2 style={{ marginTop: 5 }}>Dokumenty</h2>
                  </div>

                  {(isAdmin ||
                    patrols.some(
                      (patrol) =>
                        patrol.leader_id === session.user.id
                    )) && (
                    <button
                      style={primaryStyle}
                      onClick={openDocumentForm}
                    >
                      + Dodaj dokument
                    </button>
                  )}
                </div>

                {isAdmin && (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 9,
                        marginBottom: 12,
                      }}
                    >
                      {[
                        {
                          key: "parents",
                          icon: "👨‍👩‍👧",
                          label: "Rodzice",
                          count: documents.filter(
                            (item) => item.audience_type === "parents"
                          ).length,
                        },
                        {
                          key: "members",
                          icon: "⚜️",
                          label: "Harcerze",
                          count: documents.filter(
                            (item) => item.audience_type === "members"
                          ).length,
                        },
                        {
                          key: "patrol",
                          icon: "🏕️",
                          label: "Zastępy",
                          count: documents.filter(
                            (item) => item.audience_type === "patrol"
                          ).length,
                        },
                        {
                          key: "user",
                          icon: "👤",
                          label: "Konkretne osoby",
                          count: documents.filter(
                            (item) => item.audience_type === "user"
                          ).length,
                        },
                      ].map((item) => (
                        <button
                          key={`doc-stat-${item.key}`}
                          onClick={() =>
                            setDocumentAdminFilter(item.key)
                          }
                          style={{
                            ...cardStyle,
                            border: 0,
                            cursor: "pointer",
                            textAlign: "left",
                            padding: 13,
                            boxShadow: "none",
                            background:
                              documentAdminFilter === item.key
                                ? "#eef4ef"
                                : "white",
                            outline:
                              documentAdminFilter === item.key
                                ? "2px solid #607b54"
                                : "1px solid #e1e5e1",
                          }}
                        >
                          <div style={{ fontSize: 20 }}>{item.icon}</div>
                          <strong
                            style={{
                              display: "block",
                              marginTop: 5,
                            }}
                          >
                            {item.label}
                          </strong>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6a756e",
                              marginTop: 3,
                            }}
                          >
                            {item.count} plików
                          </div>
                        </button>
                      ))}
                    </div>

                    <div
                      style={{
                        ...cardStyle,
                        boxShadow: "none",
                        marginBottom: 14,
                        background: "#f7f5ee",
                      }}
                    >
                      <strong>Filtruj dokumenty</strong>

                      <div
                        style={{
                          display: "flex",
                          gap: 7,
                          flexWrap: "wrap",
                          marginTop: 10,
                        }}
                      >
                        {[
                          ["all", "Wszystkie"],
                          ["parents", "Rodzice"],
                          ["members", "Harcerze"],
                          ["patrol", "Zastępy"],
                          ["patrol_leaders", "Zastępowi"],
                          ["user", "Konkretne osoby"],
                          ["all_users", "Wszyscy"],
                        ].map(([key, label]) => (
                          <button
                            key={`doc-filter-${key}`}
                            onClick={() =>
                              setDocumentAdminFilter(key)
                            }
                            style={
                              documentAdminFilter === key
                                ? primaryStyle
                                : secondaryStyle
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <input
                        value={documentSearch}
                        onChange={(event) =>
                          setDocumentSearch(event.target.value)
                        }
                        placeholder="Szukaj po nazwie dokumentu lub odbiorcy..."
                        style={{
                          ...inputStyle,
                          marginTop: 10,
                        }}
                      />
                    </div>
                  </>
                )}

                {(() => {
                  const visibleDocuments = documents.filter((item) => {
                    if (isAdmin) {
                      const typeMatches =
                        documentAdminFilter === "all" ||
                        (documentAdminFilter === "all_users"
                          ? item.audience_type === "all"
                          : item.audience_type === documentAdminFilter);

                      if (!typeMatches) return false;
                    }

                    const patrol = patrols.find(
                      (p) => Number(p.id) === Number(item.patrol_id)
                    );

                    const targetPerson = people.find(
                      (person) => person.id === item.target_user_id
                    );

                    const search = documentSearch.trim().toLowerCase();

                    if (!search) return true;

                    const haystack = [
                      item.title,
                      item.description,
                      item.file_name,
                      patrol?.name,
                      targetPerson?.full_name,
                      targetPerson?.name,
                    ]
                      .filter(Boolean)
                      .join(" ")
                      .toLowerCase();

                    return haystack.includes(search);
                  });

                  if (visibleDocuments.length === 0) {
                    return (
                      <div
                        style={{
                          ...cardStyle,
                          color: "#68736d",
                        }}
                      >
                        {documents.length === 0
                          ? "Brak dokumentów dostępnych dla Twojego konta."
                          : "Brak dokumentów pasujących do wybranego filtra."}
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: "grid", gap: 10 }}>
                      {visibleDocuments.map((item) => {
                        const patrol = patrols.find(
                          (p) => Number(p.id) === Number(item.patrol_id)
                        );

                        const targetPerson = people.find(
                          (person) =>
                            person.id === item.target_user_id
                        );

                        const uploader = people.find(
                          (person) => person.id === item.uploaded_by
                        );

                        const audienceLabel =
                          item.audience_type === "parents"
                            ? "RODZICE"
                            : item.audience_type === "members"
                            ? "HARCERZE"
                            : item.audience_type === "patrol"
                            ? `ZASTĘP: ${patrol?.name || "nieznany"}`
                            : item.audience_type === "patrol_leaders"
                            ? `ZASTĘPOWI: ${patrol?.name || "nieznany"}`
                            : item.audience_type === "user"
                            ? `OSOBA: ${
                                targetPerson?.full_name ||
                                targetPerson?.name ||
                                "nieznany użytkownik"
                              }`
                            : "WSZYSCY";

                        const audienceIcon =
                          item.audience_type === "parents"
                            ? "👨‍👩‍👧"
                            : item.audience_type === "members"
                            ? "⚜️"
                            : item.audience_type === "patrol"
                            ? "🏕️"
                            : item.audience_type === "patrol_leaders"
                            ? "🧭"
                            : item.audience_type === "user"
                            ? "👤"
                            : "📢";

                        return (
                          <div
                            key={`doc-${item.id}`}
                            style={{
                              ...cardStyle,
                              borderLeft:
                                item.audience_type === "parents"
                                  ? "5px solid #8b2635"
                                  : item.audience_type === "members"
                                  ? "5px solid #607b54"
                                  : item.audience_type === "user"
                                  ? "5px solid #b98a2f"
                                  : "5px solid #506f80",
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
                                  {audienceIcon} ODBIORCY: {audienceLabel}
                                </div>

                                <h3 style={{ margin: "6px 0" }}>
                                  {item.title}
                                </h3>
                              </div>

                              {isAdmin && (
                                <span
                                  style={{
                                    background: "#f1f3f1",
                                    borderRadius: 20,
                                    padding: "5px 8px",
                                    fontSize: 10,
                                    fontWeight: 900,
                                    whiteSpace: "nowrap",
                                    color: "#536159",
                                  }}
                                >
                                  ID {item.id}
                                </span>
                              )}
                            </div>

                            {isAdmin && (
                              <div
                                style={{
                                  margin: "10px 0",
                                  padding: 10,
                                  borderRadius: 12,
                                  background: "#f7f5ee",
                                  color: "#59675f",
                                  fontSize: 12,
                                  lineHeight: 1.6,
                                }}
                              >
                                <strong>Udostępniono:</strong>{" "}
                                {audienceLabel}
                                <br />
                                <strong>Dodał:</strong>{" "}
                                {uploader?.full_name ||
                                  uploader?.name ||
                                  "użytkownik"}
                                <br />
                                <strong>Data:</strong>{" "}
                                {new Date(item.created_at).toLocaleString(
                                  "pl-PL"
                                )}
                              </div>
                            )}

                            {item.description && (
                              <p
                                style={{
                                  color: "#59675f",
                                  lineHeight: 1.55,
                                }}
                              >
                                {item.description}
                              </p>
                            )}

                            <div
                              style={{
                                color: "#7a837e",
                                fontSize: 12,
                                marginBottom: 10,
                              }}
                            >
                              📎 {item.file_name}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                style={primaryStyle}
                                onClick={() => openDocument(item)}
                              >
                                Otwórz
                              </button>

                              {isAdmin && (
                                <button
                                  style={{
                                    ...secondaryStyle,
                                    color: "#8b2635",
                                    borderColor: "#dfc1c5",
                                  }}
                                  onClick={() => deleteDocument(item)}
                                >
                                  Usuń
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}

            {moreSection === "profile" && (
              <>
                <div style={eyebrowStyle}>Konto w 5 WDH</div>
                <h2 style={{ marginTop: 5 }}>Mój profil</h2>

                <div style={cardStyle}>
                  <div
                    style={{
                      fontSize: 21,
                      fontWeight: 900,
                      marginBottom: 12,
                    }}
                  >
                    {currentProfile?.full_name ||
                      currentProfile?.name ||
                      session.user.email}
                  </div>

                  <div style={{ lineHeight: 1.85, color: "#536159" }}>
                    <strong>Rola:</strong>{" "}
                    {roleLabel(currentProfile?.role)}
                    <br />

                    <strong>Funkcja:</strong>{" "}
                    {currentProfile?.function_title || "—"}
                    <br />

                    <strong>Zastęp:</strong>{" "}
                    {(() => {
                      const membership = memberships.find(
                        (item) => item.user_id === session.user.id
                      );
                      return (
                        patrols.find(
                          (patrol) =>
                            Number(patrol.id) ===
                            Number(membership?.patrol_id)
                        )?.name || "—"
                      );
                    })()}
                    <br />

                    <strong>Numer ewidencji:</strong>{" "}
                    {currentProfile?.membership_number || "nie wpisano"}
                  </div>

                  {!currentProfile?.membership_number && (
                    <div
                      style={{
                        marginTop: 12,
                        background: "#fffaf0",
                        border: "1px solid #ead8a7",
                        borderRadius: 12,
                        padding: 11,
                        color: "#6f5722",
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      Numer ewidencji może uzupełnić wyłącznie administrator.
                    </div>
                  )}
                </div>
              </>
            )}

            {moreSection === "dues" && (
              <>
                <div style={eyebrowStyle}>Składki członkowskie</div>
                <h2 style={{ marginTop: 5 }}>Status składek</h2>

                <div
                  style={{
                    ...cardStyle,
                    marginBottom: 14,
                    borderLeft: dueFor(
                      session.user.id,
                      new Date().getFullYear(),
                      quarterForDate()
                    )?.paid
                      ? "5px solid #607b54"
                      : "5px solid #8b2635",
                  }}
                >
                  <div style={eyebrowStyle}>BIEŻĄCY KWARTAŁ</div>
                  <h3 style={{ margin: "6px 0" }}>
                    {quarterLabel(quarterForDate())}{" "}
                    {new Date().getFullYear()}
                  </h3>

                  <strong
                    style={{
                      color: dueFor(
                        session.user.id,
                        new Date().getFullYear(),
                        quarterForDate()
                      )?.paid
                        ? "#315d3e"
                        : "#8b2635",
                    }}
                  >
                    {dueFor(
                      session.user.id,
                      new Date().getFullYear(),
                      quarterForDate()
                    )?.paid
                      ? "✓ OPŁACONA"
                      : "✕ NIEOPŁACONA"}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <button
                    style={secondaryStyle}
                    onClick={() =>
                      setDuesViewYear((year) => year - 1)
                    }
                  >
                    ← {duesViewYear - 1}
                  </button>

                  <h3 style={{ margin: 0 }}>Rok {duesViewYear}</h3>

                  <button
                    style={secondaryStyle}
                    onClick={() =>
                      setDuesViewYear((year) => year + 1)
                    }
                  >
                    {duesViewYear + 1} →
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 9,
                    marginBottom: 20,
                  }}
                >
                  {[1, 2, 3, 4].map((quarter) => {
                    const due = dueFor(
                      session.user.id,
                      duesViewYear,
                      quarter
                    );

                    return (
                      <div
                        key={`own-due-${duesViewYear}-${quarter}`}
                        style={{
                          ...cardStyle,
                          boxShadow: "none",
                          padding: 12,
                          border: due?.paid
                            ? "1px solid #a9bbaa"
                            : "1px solid #e1d0d2",
                          background: due?.paid
                            ? "#f1f7f2"
                            : "#fff8f8",
                        }}
                      >
                        <strong>{quarterLabel(quarter)}</strong>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            fontWeight: 900,
                            color: due?.paid
                              ? "#315d3e"
                              : "#8b2635",
                          }}
                        >
                          {due?.paid ? "OPŁACONA" : "NIEOPŁACONA"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isAdmin && (
                  <>
                    <div style={eyebrowStyle}>PANEL ADMINA</div>

                    <div
                      style={{
                        ...cardStyle,
                        boxShadow: "none",
                        marginBottom: 12,
                        background: "#f7f5ee",
                      }}
                    >
                      <strong>Wybierz okres do oznaczania</strong>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 9,
                          marginTop: 10,
                        }}
                      >
                        <label>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              marginBottom: 5,
                              color: "#5d6962",
                            }}
                          >
                            Rok
                          </div>

                          <input
                            type="number"
                            min="2020"
                            max="2100"
                            value={adminDueYear}
                            onChange={(event) =>
                              setAdminDueYear(
                                Number(event.target.value) ||
                                  new Date().getFullYear()
                              )
                            }
                            style={inputStyle}
                          />
                        </label>

                        <label>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              marginBottom: 5,
                              color: "#5d6962",
                            }}
                          >
                            Kwartał
                          </div>

                          <select
                            value={adminDueQuarter}
                            onChange={(event) =>
                              setAdminDueQuarter(
                                Number(event.target.value)
                              )
                            }
                            style={inputStyle}
                          >
                            <option value={1}>I kwartał</option>
                            <option value={2}>II kwartał</option>
                            <option value={3}>III kwartał</option>
                            <option value={4}>IV kwartał</option>
                          </select>
                        </label>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginTop: 10,
                        }}
                      >
                        <button
                          style={secondaryStyle}
                          onClick={() => {
                            const quarter =
                              adminDueQuarter === 1
                                ? 4
                                : adminDueQuarter - 1;
                            const year =
                              adminDueQuarter === 1
                                ? adminDueYear - 1
                                : adminDueYear;

                            setAdminDueQuarter(quarter);
                            setAdminDueYear(year);
                          }}
                        >
                          ← poprzedni kwartał
                        </button>

                        <button
                          style={secondaryStyle}
                          onClick={() => {
                            const quarter =
                              adminDueQuarter === 4
                                ? 1
                                : adminDueQuarter + 1;
                            const year =
                              adminDueQuarter === 4
                                ? adminDueYear + 1
                                : adminDueYear;

                            setAdminDueQuarter(quarter);
                            setAdminDueYear(year);
                          }}
                        >
                          następny kwartał →
                        </button>
                      </div>
                    </div>

                    <h3
                      style={{
                        marginTop: 5,
                        marginBottom: 10,
                      }}
                    >
                      {quarterLabel(adminDueQuarter)}{" "}
                      {adminDueYear} — drużyna
                    </h3>

                    <div style={{ display: "grid", gap: 9 }}>
                      {people
                        .filter(
                          (person) =>
                            normalizeRole(person.role) !== "parent"
                        )
                        .map((person) => {
                          const due = dueFor(
                            person.id,
                            adminDueYear,
                            adminDueQuarter
                          );

                          return (
                            <div
                              key={`admin-due-${adminDueYear}-${adminDueQuarter}-${person.id}`}
                              style={{
                                ...cardStyle,
                                boxShadow: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                              }}
                            >
                              <div>
                                <strong>
                                  {person.full_name ||
                                    person.name ||
                                    "Użytkownik"}
                                </strong>

                                <div
                                  style={{
                                    marginTop: 4,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    color: due?.paid
                                      ? "#315d3e"
                                      : "#8b2635",
                                  }}
                                >
                                  {due?.paid
                                    ? "OPŁACONA"
                                    : "NIEOPŁACONA"}
                                </div>
                              </div>

                              <button
                                style={
                                  due?.paid
                                    ? secondaryStyle
                                    : primaryStyle
                                }
                                disabled={duesSaving}
                                onClick={() =>
                                  setDuePaid(
                                    person.id,
                                    adminDueYear,
                                    adminDueQuarter,
                                    !due?.paid
                                  )
                                }
                              >
                                {due?.paid
                                  ? "Cofnij"
                                  : "Oznacz opłaconą"}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </>
            )}

            {moreSection === "notifications" && (
              <>
                <div style={eyebrowStyle}>Telefon i aplikacja</div>
                <h2 style={{ marginTop: 5 }}>Powiadomienia</h2>

                <div
                  style={{
                    ...cardStyle,
                    marginBottom: 14,
                    border:
                      pushStatus === "enabled"
                        ? "1px solid #a9bbaa"
                        : "1px solid #ead8a7",
                    background:
                      pushStatus === "enabled"
                        ? "#f1f7f2"
                        : "#fffaf0",
                  }}
                >
                  <strong>
                    {pushStatus === "enabled"
                      ? "🔔 Powiadomienia push są włączone"
                      : pushStatus === "blocked"
                      ? "🔕 Powiadomienia są zablokowane w przeglądarce"
                      : pushStatus === "unsupported"
                      ? "Ta przeglądarka nie obsługuje push"
                      : "🔔 Włącz powiadomienia na tym urządzeniu"}
                  </strong>

                  <p
                    style={{
                      color: "#5f6c64",
                      lineHeight: 1.55,
                    }}
                  >
                    Dostaniesz informacje o akceptacji rezerwacji,
                    ważnych ogłoszeniach, nowych wydarzeniach i zadaniach.
                  </p>

                  {pushStatus === "enabled" ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        style={secondaryStyle}
                        disabled={pushBusy}
                        onClick={disablePushNotifications}
                      >
                        Wyłącz na tym urządzeniu
                      </button>

                      <button
                        style={primaryStyle}
                        disabled={pushBusy}
                        onClick={() =>
                          sendPush({
                            kind: "test",
                            title: "Test 5 WDH",
                            body: "Powiadomienia działają 🎉",
                            link: "/?view=more&section=notifications",
                          })
                        }
                      >
                        Wyślij test
                      </button>
                    </div>
                  ) : pushStatus !== "blocked" &&
                    pushStatus !== "unsupported" ? (
                    <button
                      style={primaryStyle}
                      disabled={pushBusy}
                      onClick={enablePushNotifications}
                    >
                      {pushBusy
                        ? "Włączam..."
                        : "Włącz powiadomienia"}
                    </button>
                  ) : null}
                </div>

                <h3>Ostatnie powiadomienia</h3>

                {notifications.length === 0 ? (
                  <div
                    style={{
                      ...cardStyle,
                      color: "#68736d",
                    }}
                  >
                    Nie masz jeszcze żadnych powiadomień.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 9 }}>
                    {notifications.map((item) => (
                      <button
                        key={`notification-${item.id}`}
                        onClick={() => openNotification(item)}
                        style={{
                          ...cardStyle,
                          border: 0,
                          width: "100%",
                          cursor: "pointer",
                          textAlign: "left",
                          color: "#17231c",
                          borderLeft: item.read_at
                            ? "5px solid #d6dbd6"
                            : "5px solid #8b2635",
                        }}
                      >
                        <strong>{item.title}</strong>

                        <div
                          style={{
                            color: "#5f6c64",
                            marginTop: 5,
                            lineHeight: 1.5,
                          }}
                        >
                          {item.body}
                        </div>

                        <div
                          style={{
                            marginTop: 7,
                            fontSize: 11,
                            color: "#8a918d",
                          }}
                        >
                          {new Date(item.created_at).toLocaleString(
                            "pl-PL"
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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
                                ? `Zastępowy — ${leaderPatrol.name}`
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
                              {person.membership_number
                                ? ` • nr ${person.membership_number}`
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

      {documentModalOpen && (
        <ModalBackground
          close={() =>
            !documentSaving && setDocumentModalOpen(false)
          }
        >
          <div style={eyebrowStyle}>Dokumenty</div>
          <h2 style={{ marginTop: 5 }}>Dodaj dokument</h2>

          <div style={{ display: "grid", gap: 14 }}>
            <label>
              <strong>Nazwa dokumentu</strong>
              <input
                value={documentForm.title}
                onChange={(event) =>
                  setDocumentForm({
                    ...documentForm,
                    title: event.target.value,
                  })
                }
                placeholder="np. Zgoda na biwak"
                style={inputStyle}
              />
            </label>

            <label>
              <strong>Opis</strong>
              <textarea
                value={documentForm.description}
                onChange={(event) =>
                  setDocumentForm({
                    ...documentForm,
                    description: event.target.value,
                  })
                }
                rows={3}
                style={{
                  ...inputStyle,
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </label>

            {isAdmin ? (
              <label>
                <strong>Dla kogo?</strong>
                <select
                  value={documentForm.audienceType}
                  onChange={(event) =>
                    setDocumentForm({
                      ...documentForm,
                      audienceType: event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  <option value="all">Wszyscy</option>
                  <option value="parents">Rodzice</option>
                  <option value="members">Harcerze</option>
                  <option value="patrol">Konkretny zastęp</option>
                  <option value="patrol_leaders">
                    Zastępowi konkretnego zastępu
                  </option>
                  <option value="user">Konkretna osoba</option>
                </select>
              </label>
            ) : (
              <div
                style={{
                  ...cardStyle,
                  boxShadow: "none",
                  background: "#f1f7f2",
                }}
              >
                Jako zastępowy możesz dodać dokument dla swojego zastępu.
              </div>
            )}

            {(documentForm.audienceType === "patrol" ||
              documentForm.audienceType === "patrol_leaders" ||
              !isAdmin) && (
              <label>
                <strong>Zastęp</strong>
                <select
                  value={documentForm.patrolId}
                  onChange={(event) =>
                    setDocumentForm({
                      ...documentForm,
                      patrolId: event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {(isAdmin
                    ? patrols
                    : patrols.filter(
                        (patrol) =>
                          patrol.leader_id === session.user.id
                      )
                  ).map((patrol) => (
                    <option
                      key={`doc-patrol-${patrol.id}`}
                      value={String(patrol.id)}
                    >
                      {patrol.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {isAdmin &&
              documentForm.audienceType === "user" && (
                <label>
                  <strong>Użytkownik</strong>
                  <select
                    value={documentForm.targetUserId}
                    onChange={(event) =>
                      setDocumentForm({
                        ...documentForm,
                        targetUserId: event.target.value,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="">Wybierz osobę</option>
                    {people.map((person) => (
                      <option
                        key={`doc-person-${person.id}`}
                        value={person.id}
                      >
                        {person.full_name ||
                          person.name ||
                          "Użytkownik"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

            <label>
              <strong>Plik</strong>
              <input
                type="file"
                onChange={(event) =>
                  setDocumentForm({
                    ...documentForm,
                    file: event.target.files?.[0] || null,
                  })
                }
                style={inputStyle}
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
                disabled={documentSaving}
                onClick={() => setDocumentModalOpen(false)}
              >
                Anuluj
              </button>

              <button
                style={primaryStyle}
                disabled={documentSaving}
                onClick={saveDocument}
              >
                {documentSaving ? "Wysyłam..." : "Dodaj plik"}
              </button>
            </div>
          </div>
        </ModalBackground>
      )}

      {taskChatTask && (
        <ModalBackground
          close={() => setTaskChatTask(null)}
        >
          <div style={eyebrowStyle}>Czat do zadania</div>
          <h2 style={{ marginTop: 5 }}>
            {taskChatTask.title}
          </h2>

          <div
            style={{
              maxHeight: "48vh",
              overflowY: "auto",
              display: "grid",
              gap: 8,
              margin: "12px 0",
              paddingRight: 3,
            }}
          >
            {taskMessages.length === 0 ? (
              <div
                style={{
                  ...cardStyle,
                  boxShadow: "none",
                  color: "#6c756f",
                }}
              >
                Jeszcze nikt nic nie napisał. Zacznij rozmowę.
              </div>
            ) : (
              taskMessages.map((message) => {
                const author = people.find(
                  (person) => person.id === message.user_id
                );

                const mine =
                  message.user_id === session.user.id;

                return (
                  <div
                    key={`message-${message.id}`}
                    style={{
                      ...cardStyle,
                      boxShadow: "none",
                      background: mine ? "#f1f7f2" : "#f7f5ee",
                      marginLeft: mine ? 24 : 0,
                      marginRight: mine ? 0 : 24,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>
                        {author?.full_name ||
                          author?.name ||
                          "Użytkownik"}
                      </strong>

                      <span
                        style={{
                          fontSize: 10,
                          color: "#89918c",
                        }}
                      >
                        {new Date(
                          message.created_at
                        ).toLocaleString("pl-PL")}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 7,
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {message.message}
                    </div>

                    {(mine || isAdmin) && (
                      <button
                        style={{
                          border: 0,
                          background: "transparent",
                          color: "#8b2635",
                          padding: "7px 0 0",
                          cursor: "pointer",
                          fontSize: 11,
                        }}
                        onClick={() =>
                          deleteTaskMessage(message)
                        }
                      >
                        Usuń
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <textarea
            value={taskMessageText}
            onChange={(event) =>
              setTaskMessageText(event.target.value)
            }
            placeholder="Napisz wiadomość..."
            rows={3}
            style={{
              ...inputStyle,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 9,
              marginTop: 10,
            }}
          >
            <button
              style={secondaryStyle}
              onClick={() => setTaskChatTask(null)}
            >
              Zamknij
            </button>

            <button
              style={primaryStyle}
              disabled={
                taskMessageSaving || !taskMessageText.trim()
              }
              onClick={sendTaskMessage}
            >
              {taskMessageSaving ? "Wysyłam..." : "Wyślij"}
            </button>
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
              <strong>Numer ewidencji</strong>
              <input
                value={userEditor.membershipNumber}
                onChange={(event) =>
                  setUserEditor({
                    ...userEditor,
                    membershipNumber: event.target.value,
                  })
                }
                placeholder="np. numer z ewidencji ZHP"
                style={inputStyle}
              />
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#6d7771",
                }}
              >
                To pole może zmienić tylko administrator.
              </div>
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

            {userEditor.role === "parent" && (
              <div
                style={{
                  ...cardStyle,
                  boxShadow: "none",
                  background: "#f7f5ee",
                }}
              >
                <strong>Przypisane dzieci</strong>

                <div
                  style={{
                    fontSize: 12,
                    color: "#6c756f",
                    marginTop: 4,
                    marginBottom: 10,
                  }}
                >
                  Rodzic zobaczy informacje dotyczące zaznaczonych osób.
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {people
                    .filter(
                      (person) =>
                        person.id !== userEditor.id &&
                        normalizeRole(person.role) !== "parent"
                    )
                    .map((person) => {
                      const checked =
                        userEditor.childIds?.includes(person.id) || false;

                      return (
                        <label
                          key={`child-${person.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [
                                    ...(userEditor.childIds || []),
                                    person.id,
                                  ]
                                : (userEditor.childIds || []).filter(
                                    (id) => id !== person.id
                                  );

                              setUserEditor({
                                ...userEditor,
                                childIds: next,
                              });
                            }}
                          />

                          <span>
                            {person.full_name ||
                              person.name ||
                              "Użytkownik"}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}

            <label>
              <strong>Funkcja</strong>

              <select
                value={userEditor.functionMode || ""}
                onChange={(event) => {
                  const value = event.target.value;

                  setUserEditor({
                    ...userEditor,
                    functionMode: value,
                    functionTitle:
                      value === "custom"
                        ? ""
                        : value,
                    isStaff:
                      value === ""
                        ? userEditor.isStaff
                        : true,
                  });
                }}
                style={inputStyle}
              >
                <option value="">Brak funkcji</option>
                <option value="Przyboczny">Przyboczny</option>
                <option value="Zastępowy">Zastępowy</option>
                <option value="Podzastępowy">Podzastępowy</option>
                <option value="custom">Wpisz własne</option>
              </select>

              {userEditor.functionMode === "custom" && (
                <input
                  value={userEditor.functionTitle}
                  onChange={(event) =>
                    setUserEditor({
                      ...userEditor,
                      functionTitle: event.target.value,
                    })
                  }
                  placeholder="Wpisz własną funkcję"
                  style={{
                    ...inputStyle,
                    marginTop: 8,
                  }}
                  autoFocus
                />
              )}
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
              <span
                style={{
                  fontSize: 11,
                  color: "#768079",
                }}
              >
                (przy wybranej funkcji włącza się automatycznie)
              </span>
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
                <option value="staff">Kadra</option>
                <option value="user">Konkretna osoba</option>
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

            {taskForm.audience === "staff" && (
              <div
                style={{
                  ...cardStyle,
                  boxShadow: "none",
                  background: "#f1f7f2",
                  color: "#536159",
                }}
              >
                Zadanie zobaczy cała kadra: osoby oznaczone jako kadra
                oraz osoby z przypisaną funkcją.
              </div>
            )}

            {taskForm.audience === "user" && (
              <label>
                <strong>Osoba</strong>
                <select
                  value={taskForm.targetUserId}
                  onChange={(event) =>
                    setTaskForm({
                      ...taskForm,
                      targetUserId: event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  <option value="">Wybierz osobę</option>

                  {people
                    .filter(
                      (person) =>
                        normalizeRole(person.role) !== "parent"
                    )
                    .sort((a, b) =>
                      (a.full_name || a.name || "").localeCompare(
                        b.full_name || b.name || "",
                        "pl"
                      )
                    )
                    .map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.full_name ||
                          person.name ||
                          "Użytkownik"}
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

                {isTripType(eventForm.eventType) && (
                  <option value="selected">
                    Wybrane osoby
                  </option>
                )}
              </select>
            </label>

            {eventForm.audience === "selected" &&
              isTripType(eventForm.eventType) && (
                <div
                  style={{
                    ...cardStyle,
                    boxShadow: "none",
                    background: "#f7f5ee",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>Kto jedzie?</strong>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        style={secondaryStyle}
                        onClick={() =>
                          setEventForm({
                            ...eventForm,
                            selectedUserIds: people
                              .filter(
                                (person) =>
                                  normalizeRole(person.role) !== "parent"
                              )
                              .map((person) => person.id),
                          })
                        }
                      >
                        Zaznacz wszystkich
                      </button>

                      <button
                        type="button"
                        style={secondaryStyle}
                        onClick={() =>
                          setEventForm({
                            ...eventForm,
                            selectedUserIds: [],
                          })
                        }
                      >
                        Wyczyść
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      marginTop: 10,
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    {people
                      .filter(
                        (person) =>
                          normalizeRole(person.role) !== "parent"
                      )
                      .map((person) => {
                        const checked =
                          eventForm.selectedUserIds.includes(person.id);

                        return (
                          <label
                            key={`event-person-${person.id}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9,
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setEventForm({
                                  ...eventForm,
                                  selectedUserIds: event.target.checked
                                    ? [
                                        ...eventForm.selectedUserIds,
                                        person.id,
                                      ]
                                    : eventForm.selectedUserIds.filter(
                                        (id) => id !== person.id
                                      ),
                                })
                              }
                            />

                            <span>
                              {person.full_name ||
                                person.name ||
                                "Użytkownik"}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

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

            {isTripType(eventForm.eventType) && (
              <div
                style={{
                  ...cardStyle,
                  boxShadow: "none",
                  background: "#fffaf0",
                  border: "1px solid #ead8a7",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={eventForm.signupEnabled}
                    onChange={(event) =>
                      setEventForm({
                        ...eventForm,
                        signupEnabled: event.target.checked,
                      })
                    }
                  />

                  <strong>Otwórz zgłoszenia „Zgłoś się”</strong>
                </label>

                {eventForm.signupEnabled && (
                  <label
                    style={{
                      display: "block",
                      marginTop: 10,
                    }}
                  >
                    <strong>Termin zgłoszeń</strong>
                    <input
                      type="date"
                      value={eventForm.signupDeadline}
                      onChange={(event) =>
                        setEventForm({
                          ...eventForm,
                          signupDeadline: event.target.value,
                        })
                      }
                      style={inputStyle}
                    />
                  </label>
                )}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <label>
                <strong>Data od</strong>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(event) =>
                    setEventForm({
                      ...eventForm,
                      date: event.target.value,
                      endDate:
                        eventForm.endDate &&
                        eventForm.endDate < event.target.value
                          ? ""
                          : eventForm.endDate,
                    })
                  }
                  style={inputStyle}
                />
              </label>

              <label>
                <strong>Data do</strong>
                <input
                  type="date"
                  min={eventForm.date || undefined}
                  value={eventForm.endDate}
                  onChange={(event) =>
                    setEventForm({
                      ...eventForm,
                      endDate: event.target.value,
                    })
                  }
                  style={inputStyle}
                />
                <div
                  style={{
                    marginTop: 5,
                    fontSize: 11,
                    color: "#7a837e",
                  }}
                >
                  Zostaw puste przy wydarzeniu jednodniowym.
                </div>
              </label>
            </div>

            <div
              style={{
                ...cardStyle,
                boxShadow: "none",
                background: "#f7f5ee",
              }}
            >
              <strong>Godziny — opcjonalnie</strong>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 9,
                }}
              >
                <label>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>Od</span>
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
                  <span style={{ fontSize: 12, fontWeight: 800 }}>Do</span>
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

              <button
                type="button"
                style={{ ...secondaryStyle, marginTop: 8 }}
                onClick={() =>
                  setEventForm({
                    ...eventForm,
                    startTime: "",
                    endTime: "",
                  })
                }
              >
                Bez godzin
              </button>
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
              <strong>Osoba odpowiedzialna</strong>

              <select
                value={eventForm.responsiblePersonId}
                onChange={(event) =>
                  setEventForm({
                    ...eventForm,
                    responsiblePersonId: event.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="">Nie wybrano</option>

                {people
                  .filter(
                    (person) =>
                      normalizeRole(person.role) !== "parent"
                  )
                  .map((person) => (
                    <option
                      key={person.id}
                      value={person.id}
                    >
                      {person.full_name || person.name || "Użytkownik"}
                    </option>
                  ))}
              </select>
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

      {assignmentEditorEvent && (
        <ModalBackground
          close={() =>
            !assignmentSaving &&
            setAssignmentEditorEvent(null)
          }
        >
          <div style={eyebrowStyle}>Panel administratora</div>

          <h2 style={{ marginTop: 5 }}>
            Skład: {assignmentEditorEvent.title}
          </h2>

          <p
            style={{
              color: "#68736d",
              lineHeight: 1.55,
            }}
          >
            Zaznacz osoby jadące i określ, czy jadą jako uczestnicy,
            reprezentacja drużyny czy kadra.
          </p>

          <div
            style={{
              ...cardStyle,
              boxShadow: "none",
              background: "#fffaf0",
              border: "1px solid #ead8a7",
              marginBottom: 12,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={assignmentSignupEnabled}
                onChange={(event) =>
                  setAssignmentSignupEnabled(event.target.checked)
                }
              />
              <strong>Zgłoszenia „Zgłoś się” są otwarte</strong>
            </label>

            {assignmentSignupEnabled && (
              <label
                style={{
                  display: "block",
                  marginTop: 10,
                }}
              >
                <strong>Termin zgłoszeń</strong>
                <input
                  type="date"
                  value={assignmentSignupDeadline}
                  onChange={(event) =>
                    setAssignmentSignupDeadline(event.target.value)
                  }
                  style={inputStyle}
                />
              </label>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gap: 9,
              maxHeight: "52vh",
              overflowY: "auto",
              paddingRight: 3,
            }}
          >
            {people
              .filter(
                (person) =>
                  normalizeRole(person.role) !== "parent"
              )
              .map((person) => {
                const selectedType =
                  assignmentDraft[person.id] || "";

                return (
                  <div
                    key={`assign-${person.id}`}
                    style={{
                      ...cardStyle,
                      boxShadow: "none",
                      border: selectedType
                        ? "1px solid #9fb2a5"
                        : "1px solid #e1e5e1",
                      padding: 12,
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
                        checked={Boolean(selectedType)}
                        onChange={(event) =>
                          setAssignmentDraft((old) => ({
                            ...old,
                            [person.id]: event.target.checked
                              ? old[person.id] || "participant"
                              : "",
                          }))
                        }
                      />

                      <strong>
                        {person.full_name ||
                          person.name ||
                          "Użytkownik"}
                      </strong>
                    </label>

                    {selectedType && (
                      <select
                        value={selectedType}
                        onChange={(event) =>
                          setAssignmentDraft((old) => ({
                            ...old,
                            [person.id]: event.target.value,
                          }))
                        }
                        style={inputStyle}
                      >
                        <option value="participant">
                          Uczestnik
                        </option>
                        <option value="representation">
                          Reprezentacja
                        </option>
                        <option value="staff">
                          Kadra
                        </option>
                      </select>
                    )}
                  </div>
                );
              })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 9,
              marginTop: 16,
            }}
          >
            <button
              style={secondaryStyle}
              disabled={assignmentSaving}
              onClick={() =>
                setAssignmentEditorEvent(null)
              }
            >
              Anuluj
            </button>

            <button
              style={primaryStyle}
              disabled={assignmentSaving}
              onClick={saveAssignmentEditor}
            >
              {assignmentSaving
                ? "Zapisuję..."
                : "Zapisz skład"}
            </button>
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
              : eventDetails.patrol_id
              ? "WYDARZENIE ZASTĘPU"
              : assignmentsForEvent(eventDetails.id).length
              ? "WYBRANI UCZESTNICY"
              : "WYDARZENIE"}
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
            {eventDetails.end_date
              ? ` – ${formatDate(eventDetails.end_date)}`
              : ""}
            <br />

            {(eventDetails.start_time || eventDetails.end_time) && (
              <>
                🕐{" "}
                {eventDetails.start_time
                  ? normalizeTime(eventDetails.start_time)
                  : ""}
                {eventDetails.end_time
                  ? `–${normalizeTime(eventDetails.end_time)}`
                  : ""}
                <br />
              </>
            )}

            📍 {eventDetails.location}
          </div>

          {eventDetails.responsible_person_id && (
            <div
              style={{
                ...cardStyle,
                boxShadow: "none",
                marginTop: 12,
              }}
            >
              <strong>🧭 Osoba odpowiedzialna</strong>

              <div style={{ marginTop: 7, color: "#526159" }}>
                {people.find(
                  (person) =>
                    person.id === eventDetails.responsible_person_id
                )?.full_name ||
                  people.find(
                    (person) =>
                      person.id === eventDetails.responsible_person_id
                  )?.name ||
                  "Wyznaczona osoba"}
              </div>
            </div>
          )}

          {isTripType(eventDetails.event_type) &&
            assignmentsForEvent(eventDetails.id).length > 0 && (
              <div
                style={{
                  ...cardStyle,
                  boxShadow: "none",
                  background: "#f7f5ee",
                  marginTop: 12,
                }}
              >
                <div style={eyebrowStyle}>
                  {rosterLabel(eventDetails.id) || "SKŁAD WYJAZDU"}
                </div>

                <h3 style={{ margin: "6px 0 10px" }}>
                  Kto jedzie?
                </h3>

                <div style={{ display: "grid", gap: 7 }}>
                  {assignmentsForEvent(eventDetails.id).map((item) => (
                    <div
                      key={`roster-${item.id}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <strong>{item.personName}</strong>
                      <span
                        style={{
                          color: "#68736d",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {assignmentTypeLabel(item.assignment_type)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {isTripType(eventDetails.event_type) && (
              <div
                style={{
                  ...cardStyle,
                  boxShadow: "none",
                  background: "#fffaf0",
                  border: "1px solid #ead8a7",
                  marginTop: 12,
                }}
              >
                <div style={eyebrowStyle}>ZGŁOSZENIA NA WYJAZD</div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 8,
                  }}
                >
                  <strong
                    style={{
                      color: eventDetails.signup_enabled
                        ? "#315d3e"
                        : "#8b2635",
                    }}
                  >
                    {eventDetails.signup_enabled
                      ? "● ZGŁOSZENIA OTWARTE"
                      : "● ZGŁOSZENIA ZAMKNIĘTE"}
                  </strong>

                  {isAdmin && (
                    <div
                      style={{
                        display: "flex",
                        gap: 7,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        style={
                          eventDetails.signup_enabled
                            ? secondaryStyle
                            : primaryStyle
                        }
                        disabled={
                          signupSavingId === eventDetails.id
                        }
                        onClick={() =>
                          setEventSignupOpen(eventDetails, true)
                        }
                      >
                        Otwórz
                      </button>

                      <button
                        style={
                          !eventDetails.signup_enabled
                            ? secondaryStyle
                            : primaryStyle
                        }
                        disabled={
                          signupSavingId === eventDetails.id
                        }
                        onClick={() =>
                          setEventSignupOpen(eventDetails, false)
                        }
                      >
                        Zamknij
                      </button>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    margin: "8px 0 12px",
                  }}
                >
                  <span
                    style={{
                      background: "#edf7ef",
                      color: "#315d3e",
                      borderRadius: 20,
                      padding: "6px 9px",
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    JEDZIE {assignmentsForEvent(eventDetails.id).length}
                  </span>

                  <span
                    style={{
                      background: "#fff2c7",
                      color: "#715818",
                      borderRadius: 20,
                      padding: "6px 9px",
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    OCZEKUJE{" "}
                    {
                      signupsForEvent(eventDetails.id).filter(
                        (signup) => signup.status === "pending"
                      ).length
                    }
                  </span>
                </div>

                {eventDetails.signup_deadline && (
                  <div
                    style={{
                      color: "#6e6040",
                      fontSize: 13,
                      marginBottom: 10,
                    }}
                  >
                    Zgłoszenia do:{" "}
                    <strong>
                      {formatDate(eventDetails.signup_deadline)}
                    </strong>
                  </div>
                )}

                {!isAdmin && (
                  <>
                    {!eventDetails.signup_enabled ? (
                      <div
                        style={{
                          background: "#fff4f4",
                          border: "1px solid #e6c9cd",
                          borderRadius: 12,
                          padding: 10,
                          color: "#8b2635",
                          fontWeight: 800,
                        }}
                      >
                        Zgłoszenia są obecnie zamknięte.
                      </div>
                    ) : mySignupForEvent(eventDetails.id) ? (
                      <div>
                        <div
                          style={{
                            fontWeight: 900,
                            color:
                              mySignupForEvent(eventDetails.id)?.status ===
                              "approved"
                                ? "#315d3e"
                                : mySignupForEvent(eventDetails.id)?.status ===
                                  "rejected"
                                ? "#8b2635"
                                : "#715818",
                          }}
                        >
                          Twoje zgłoszenie:{" "}
                          {signupStatusLabel(
                            mySignupForEvent(eventDetails.id)?.status
                          )}
                        </div>

                        {mySignupForEvent(eventDetails.id)?.status !==
                          "approved" && (
                          <button
                            style={{
                              ...secondaryStyle,
                              marginTop: 9,
                            }}
                            disabled={
                              signupSavingId === eventDetails.id
                            }
                            onClick={() =>
                              withdrawEventSignup(eventDetails)
                            }
                          >
                            Wycofaj zgłoszenie
                          </button>
                        )}
                      </div>
                    ) : assignmentsForEvent(eventDetails.id).some(
                        (item) => item.user_id === session.user.id
                      ) ? (
                      <strong style={{ color: "#315d3e" }}>
                        ✓ Jesteś na liście uczestników
                      </strong>
                    ) : (
                      <button
                        style={primaryStyle}
                        disabled={
                          signupSavingId === eventDetails.id ||
                          (eventDetails.signup_deadline &&
                            eventDetails.signup_deadline < today)
                        }
                        onClick={() =>
                          submitEventSignup(eventDetails)
                        }
                      >
                        {signupSavingId === eventDetails.id
                          ? "Wysyłam..."
                          : eventDetails.signup_deadline &&
                            eventDetails.signup_deadline < today
                          ? "Zgłoszenia zamknięte"
                          : "🙋 Zgłoś się"}
                      </button>
                    )}
                  </>
                )}

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gap: 7,
                  }}
                >
                  <strong>Lista zatwierdzonych</strong>

                  {assignmentsForEvent(eventDetails.id).length === 0 ? (
                    <div
                      style={{
                        color: "#7b837e",
                        fontSize: 13,
                      }}
                    >
                      Na razie nikt nie jest zatwierdzony.
                    </div>
                  ) : (
                    assignmentsForEvent(eventDetails.id).map((item) => (
                      <div
                        key={`accepted-${item.id}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "7px 0",
                          borderBottom: "1px solid #ece8db",
                        }}
                      >
                        <strong>{item.personName}</strong>
                        <span
                          style={{
                            color: "#315d3e",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          JEDZIE
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gap: 7,
                  }}
                >
                  <strong>Oczekują na akceptację</strong>

                  {signupsForEvent(eventDetails.id).filter(
                    (signup) => signup.status === "pending"
                  ).length === 0 ? (
                    <div
                      style={{
                        color: "#7b837e",
                        fontSize: 13,
                      }}
                    >
                      Brak oczekujących zgłoszeń.
                    </div>
                  ) : (
                    signupsForEvent(eventDetails.id)
                      .filter(
                        (signup) => signup.status === "pending"
                      )
                      .map((signup) => (
                        <div
                          key={`pending-signup-${signup.id}`}
                          style={{
                            ...cardStyle,
                            boxShadow: "none",
                            padding: 10,
                            background: "white",
                          }}
                        >
                          <strong>{signup.personName}</strong>

                          {isAdmin && (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 7,
                                marginTop: 8,
                              }}
                            >
                              <button
                                style={secondaryStyle}
                                disabled={signupSavingId === signup.id}
                                onClick={() =>
                                  rejectEventSignup(signup)
                                }
                              >
                                Odrzuć
                              </button>

                              <button
                                style={primaryStyle}
                                disabled={signupSavingId === signup.id}
                                onClick={() =>
                                  approveEventSignup(signup)
                                }
                              >
                                Akceptuj
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>

                {isAdmin &&
                  signupsForEvent(eventDetails.id).some(
                    (signup) => signup.status === "rejected"
                  ) && (
                    <details style={{ marginTop: 12 }}>
                      <summary
                        style={{
                          cursor: "pointer",
                          fontWeight: 800,
                          color: "#8b2635",
                        }}
                      >
                        Odrzuceni (
                        {
                          signupsForEvent(eventDetails.id).filter(
                            (signup) => signup.status === "rejected"
                          ).length
                        }
                        )
                      </summary>

                      <div
                        style={{
                          display: "grid",
                          gap: 5,
                          marginTop: 8,
                          color: "#6c756f",
                        }}
                      >
                        {signupsForEvent(eventDetails.id)
                          .filter(
                            (signup) => signup.status === "rejected"
                          )
                          .map((signup) => (
                            <div key={`rejected-${signup.id}`}>
                              {signup.personName}
                            </div>
                          ))}
                      </div>
                    </details>
                  )}
              </div>
            )}

          {canUseEventCommunity(eventDetails) && (
            <div
              style={{
                ...cardStyle,
                boxShadow: "none",
                marginTop: 14,
                border: "1px solid #d8dfda",
              }}
            >
              <div style={eyebrowStyle}>STREFA WYDARZENIA</div>
              <h3 style={{ margin: "6px 0 12px" }}>
                Ogłoszenia i czat
              </h3>

              <details open={eventAnnouncements.length > 0}>
                <summary style={{ cursor: "pointer", fontWeight: 900 }}>
                  📣 Ogłoszenia ({eventAnnouncements.length})
                </summary>

                <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
                  {eventAnnouncements.map((item) => {
                    const author = people.find(
                      (person) => person.id === item.user_id
                    );

                    return (
                      <div
                        key={`event-ann-${item.id}`}
                        style={{
                          ...cardStyle,
                          boxShadow: "none",
                          background: "#f7f5ee",
                          padding: 11,
                        }}
                      >
                        <strong>{item.title}</strong>
                        <div
                          style={{
                            marginTop: 6,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.55,
                          }}
                        >
                          {item.body}
                        </div>
                        <div
                          style={{
                            marginTop: 7,
                            color: "#7b837e",
                            fontSize: 10,
                          }}
                        >
                          {author?.full_name ||
                            author?.name ||
                            "Użytkownik"}{" "}
                          •{" "}
                          {new Date(item.created_at).toLocaleString("pl-PL")}
                        </div>

                        {(item.user_id === session.user.id || isAdmin) && (
                          <button
                            style={{
                              border: 0,
                              background: "transparent",
                              color: "#8b2635",
                              padding: "7px 0 0",
                              cursor: "pointer",
                              fontSize: 11,
                            }}
                            onClick={() =>
                              deleteEventAnnouncement(item)
                            }
                          >
                            Usuń
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <div
                    style={{
                      ...cardStyle,
                      boxShadow: "none",
                      background: "#f1f7f2",
                    }}
                  >
                    <strong>Dodaj ogłoszenie</strong>
                    <input
                      value={eventAnnouncementTitle}
                      onChange={(event) =>
                        setEventAnnouncementTitle(event.target.value)
                      }
                      placeholder="Tytuł ogłoszenia"
                      style={{ ...inputStyle, marginTop: 8 }}
                    />
                    <textarea
                      value={eventAnnouncementBody}
                      onChange={(event) =>
                        setEventAnnouncementBody(event.target.value)
                      }
                      placeholder="Treść ogłoszenia..."
                      rows={3}
                      style={{
                        ...inputStyle,
                        marginTop: 8,
                        fontFamily: "inherit",
                        resize: "vertical",
                      }}
                    />
                    <button
                      style={{ ...primaryStyle, marginTop: 8 }}
                      disabled={eventCommunitySaving}
                      onClick={addEventAnnouncement}
                    >
                      Opublikuj ogłoszenie
                    </button>
                  </div>
                </div>
              </details>

              <details style={{ marginTop: 14 }}>
                <summary style={{ cursor: "pointer", fontWeight: 900 }}>
                  💬 Czat ({eventMessages.length})
                </summary>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    maxHeight: 330,
                    overflowY: "auto",
                    marginTop: 10,
                  }}
                >
                  {eventMessages.map((item) => {
                    const author = people.find(
                      (person) => person.id === item.user_id
                    );
                    const mine = item.user_id === session.user.id;

                    return (
                      <div
                        key={`event-msg-${item.id}`}
                        style={{
                          ...cardStyle,
                          boxShadow: "none",
                          marginLeft: mine ? 24 : 0,
                          marginRight: mine ? 0 : 24,
                          padding: 10,
                          background: mine
                            ? "#f1f7f2"
                            : "#f7f5ee",
                        }}
                      >
                        <strong style={{ fontSize: 12 }}>
                          {author?.full_name ||
                            author?.name ||
                            "Użytkownik"}
                        </strong>
                        <div
                          style={{
                            marginTop: 5,
                            lineHeight: 1.55,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {item.message}
                        </div>
                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 10,
                            color: "#87908a",
                          }}
                        >
                          {new Date(item.created_at).toLocaleString("pl-PL")}
                        </div>

                        {(mine || isAdmin) && (
                          <button
                            style={{
                              border: 0,
                              background: "transparent",
                              color: "#8b2635",
                              padding: "6px 0 0",
                              cursor: "pointer",
                              fontSize: 10,
                            }}
                            onClick={() => deleteEventMessage(item)}
                          >
                            Usuń
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <textarea
                  value={eventMessageText}
                  onChange={(event) =>
                    setEventMessageText(event.target.value)
                  }
                  placeholder="Napisz wiadomość do uczestników wydarzenia..."
                  rows={3}
                  style={{
                    ...inputStyle,
                    marginTop: 10,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />

                <button
                  style={{ ...primaryStyle, marginTop: 8 }}
                  disabled={
                    eventCommunitySaving || !eventMessageText.trim()
                  }
                  onClick={sendEventMessage}
                >
                  Wyślij
                </button>
              </details>
            </div>
          )}

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
                isAdmin && isTripType(eventDetails.event_type)
                  ? "1fr 1fr"
                  : isAdmin
                  ? "1fr 1fr"
                  : "1fr",
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

            {isAdmin && isTripType(eventDetails.event_type) && (
              <button
                style={primaryStyle}
                onClick={() => {
                  setEventDetails(null);
                  openAssignmentEditor(eventDetails);
                }}
              >
                Wyznacz skład
              </button>
            )}

            {isAdmin && !isTripType(eventDetails.event_type) && (
              <button
                style={primaryStyle}
                onClick={() =>
                  deleteEvent(eventDetails)
                }
              >
                Usuń wydarzenie
              </button>
            )}

            {isAdmin && isTripType(eventDetails.event_type) && (
              <button
                style={{
                  ...secondaryStyle,
                  color: "#8b2635",
                  borderColor: "#dfc1c5",
                  gridColumn: "1 / -1",
                }}
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
              <strong>Dla którego zastępu?</strong>
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
                  ? `Rezerwujesz jako: ${
                      currentProfile?.full_name ||
                      currentProfile?.name ||
                      "administrator"
                    }. Rezerwacja zostanie zatwierdzona od razu.`
                  : `Rezerwujesz jako: ${
                      currentProfile?.full_name ||
                      currentProfile?.name ||
                      "użytkownik"
                    }. Lider własnego zastępu nie potrzebuje akceptacji; pozostałe rezerwacje zatwierdza admin.`}
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
            👤 Rezerwuje: {detailsOpen.requesterName || "Użytkownik"}
            <br />
            Status: {approvalStatusLabel(detailsOpen.approvalStatus)}
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
  setLoginError,
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

function ParentApp({
  logout,
  events = [],
  eventAssignments = [],
  people = [],
  patrols = [],
  memberships = [],
  parentChildren = [],
  membershipDues = [],
  announcements = [],
  documents = [],
  currentUserId,
  openDocument,
  pushStatus,
  pushBusy,
  enablePushNotifications,
  disablePushNotifications,
}) {
  const [tab, setTab] = useState("Moje");
  const [selectedChildId, setSelectedChildId] = useState("");
  const today = dateToString(new Date());

  const childIds = parentChildren
    .filter((link) => link.parent_id === currentUserId)
    .map((link) => link.child_id);

  const children = people.filter((person) =>
    childIds.includes(person.id)
  );

  useEffect(() => {
    if (!selectedChildId && children[0]?.id) {
      setSelectedChildId(children[0].id);
    }

    if (
      selectedChildId &&
      !children.some((child) => child.id === selectedChildId)
    ) {
      setSelectedChildId(children[0]?.id || "");
    }
  }, [children.map((child) => child.id).join("|"), selectedChildId]);

  const child =
    children.find((item) => item.id === selectedChildId) ||
    children[0] ||
    null;

  const childMembership = child
    ? memberships.find((item) => item.user_id === child.id)
    : null;

  const childPatrol = patrols.find(
    (patrol) =>
      Number(patrol.id) === Number(childMembership?.patrol_id)
  );

  const childAssignments = child
    ? eventAssignments.filter(
        (assignment) => assignment.user_id === child.id
      )
    : [];

  const assignedEventIds = new Set(
    childAssignments.map((assignment) =>
      Number(assignment.event_id)
    )
  );

  const childEvents = child
    ? events
        .filter((event) => {
          if (event.event_date < today) return false;

          if (event.whole_troop) return true;

          if (
            childPatrol &&
            Number(event.patrol_id) === Number(childPatrol.id)
          ) {
            return true;
          }

          return assignedEventIds.has(Number(event.id));
        })
        .sort((a, b) =>
          `${a.event_date}T${normalizeTime(a.start_time)}`.localeCompare(
            `${b.event_date}T${normalizeTime(b.start_time)}`
          )
        )
    : [];

  const childTrips = childEvents.filter((event) =>
    isTripType(event.event_type)
  );

  const childAnnouncements = child
    ? announcements.filter(
        (item) =>
          item.whole_troop ||
          (childPatrol &&
            Number(item.patrol_id) === Number(childPatrol.id))
      )
    : [];

  function childDue(year, quarter) {
    if (!child) return null;

    return membershipDues.find(
      (item) =>
        item.user_id === child.id &&
        Number(item.due_year) === Number(year) &&
        Number(item.due_quarter) === Number(quarter)
    );
  }

  function childIsAssigned(eventId) {
    return assignedEventIds.has(Number(eventId));
  }

  if (children.length === 0) {
    return (
      <main style={appStyle}>
        <AppHeader
          subtitle="Strefa rodzica"
          logout={logout}
        />

        <section style={containerPadding}>
          <div style={eyebrowStyle}>Panel rodzica</div>
          <h2 style={{ marginTop: 5 }}>
            Brak przypisanego dziecka
          </h2>

          <div style={cardStyle}>
            Administrator musi najpierw przypisać Twoje konto rodzica
            do harcerza w panelu użytkowników.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={appStyle}>
      <AppHeader
        subtitle="Strefa rodzica"
        logout={logout}
      />

      <section style={containerPadding}>
        <label
          style={{
            display: "block",
            marginBottom: 16,
          }}
        >
          <strong>Moje dziecko</strong>

          <select
            value={child?.id || ""}
            onChange={(event) =>
              setSelectedChildId(event.target.value)
            }
            style={inputStyle}
          >
            {children.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name || item.name || "Harcerz"}
              </option>
            ))}
          </select>
        </label>

        {tab === "Moje" && (
          <>
            <div style={eyebrowStyle}>
              Najważniejsze informacje
            </div>

            <h2 style={{ marginTop: 5 }}>
              {child?.full_name || child?.name}
            </h2>

            <div
              style={{
                ...cardStyle,
                marginBottom: 14,
              }}
            >
              <div style={{ lineHeight: 1.8 }}>
                <strong>Zastęp:</strong>{" "}
                {childPatrol?.name || "brak przypisania"}
                <br />
                <strong>Funkcja:</strong>{" "}
                {child?.function_title || "—"}
                <br />
                <strong>Numer ewidencji:</strong>{" "}
                {child?.membership_number || "—"}
              </div>
            </div>

            {pushStatus !== "enabled" && (
              <div
                style={{
                  ...cardStyle,
                  background: "#fffaf0",
                  border: "1px solid #ead8a7",
                  boxShadow: "none",
                  marginBottom: 14,
                }}
              >
                <strong>🔔 Włącz powiadomienia</strong>
                <p
                  style={{
                    color: "#68736d",
                    lineHeight: 1.5,
                  }}
                >
                  Dostaniesz informacje o zmianach, wyjazdach
                  i ważnych komunikatach.
                </p>

                <button
                  style={primaryStyle}
                  disabled={pushBusy}
                  onClick={enablePushNotifications}
                >
                  {pushBusy ? "Włączam..." : "Włącz powiadomienia"}
                </button>
              </div>
            )}

            {pushStatus === "enabled" && (
              <div
                style={{
                  ...cardStyle,
                  background: "#f1f7f2",
                  border: "1px solid #a9bbaa",
                  boxShadow: "none",
                  marginBottom: 14,
                }}
              >
                <strong>🔔 Powiadomienia włączone</strong>
                <button
                  style={{
                    ...secondaryStyle,
                    display: "block",
                    marginTop: 10,
                  }}
                  onClick={disablePushNotifications}
                >
                  Wyłącz na tym urządzeniu
                </button>
              </div>
            )}

            <h3>Najbliższe wydarzenia</h3>

            {childEvents.slice(0, 4).length === 0 ? (
              <div style={{ ...cardStyle, color: "#68736d" }}>
                Brak nadchodzących wydarzeń.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {childEvents.slice(0, 4).map((event) => (
                  <div
                    key={`parent-event-${event.id}`}
                    style={{
                      ...cardStyle,
                      borderLeft: "5px solid #607b54",
                    }}
                  >
                    <div style={eyebrowStyle}>
                      {event.whole_troop
                        ? "CAŁA DRUŻYNA"
                        : childPatrol?.name || "WYDARZENIE"}
                    </div>

                    <h3 style={{ margin: "6px 0" }}>
                      {event.title}
                    </h3>

                    <div style={{ color: "#59675f", lineHeight: 1.65 }}>
                      📅 {formatDate(event.event_date)}
                      <br />
                      🕐 {normalizeTime(event.start_time)}
                      {event.end_time
                        ? `–${normalizeTime(event.end_time)}`
                        : ""}
                      <br />
                      📍 {event.location}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ marginTop: 20 }}>Wyjazdy</h3>

            {childTrips.length === 0 ? (
              <div style={{ ...cardStyle, color: "#68736d" }}>
                Brak nadchodzących wyjazdów.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {childTrips.map((event) => (
                  <div
                    key={`parent-trip-${event.id}`}
                    style={{
                      ...cardStyle,
                      borderLeft: childIsAssigned(event.id)
                        ? "5px solid #315d3e"
                        : "5px solid #d1d6d2",
                    }}
                  >
                    <div style={eyebrowStyle}>
                      {childIsAssigned(event.id)
                        ? "✓ TWOJE DZIECKO JEDZIE"
                        : "WYJAZD DRUŻYNY / ZASTĘPU"}
                    </div>

                    <h3 style={{ margin: "6px 0" }}>
                      {event.title}
                    </h3>

                    <div style={{ color: "#59675f", lineHeight: 1.65 }}>
                      📅 {formatDate(event.event_date)}
                      <br />
                      🕐 {normalizeTime(event.start_time)}
                      {event.end_time
                        ? `–${normalizeTime(event.end_time)}`
                        : ""}
                      <br />
                      📍 {event.location}

                      {event.cost && (
                        <>
                          <br />
                          💰 {event.cost}
                          {event.payment_deadline
                            ? ` • do ${formatDate(event.payment_deadline)}`
                            : ""}
                        </>
                      )}

                      {event.what_to_bring && (
                        <>
                          <br />
                          🎒 {event.what_to_bring}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {childAnnouncements.length > 0 && (
              <>
                <h3 style={{ marginTop: 20 }}>Ogłoszenia</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {childAnnouncements.slice(0, 5).map((item) => (
                    <div
                      key={`parent-ann-${item.id}`}
                      style={{
                        ...cardStyle,
                        borderLeft: item.important
                          ? "5px solid #8b2635"
                          : "5px solid #b98a2f",
                      }}
                    >
                      <strong>{item.title}</strong>
                      <p
                        style={{
                          marginBottom: 0,
                          color: "#5d6962",
                          lineHeight: 1.55,
                        }}
                      >
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "Kalendarz" && (
          <>
            <div style={eyebrowStyle}>Terminy dziecka</div>
            <h2 style={{ marginTop: 5 }}>Kalendarz</h2>

            {childEvents.length === 0 ? (
              <div style={{ ...cardStyle, color: "#68736d" }}>
                Brak nadchodzących terminów.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 9 }}>
                {childEvents.map((event) => (
                  <div
                    key={`calendar-${event.id}`}
                    style={cardStyle}
                  >
                    <strong>{event.title}</strong>
                    <div
                      style={{
                        marginTop: 5,
                        color: "#627068",
                        lineHeight: 1.55,
                      }}
                    >
                      {formatDate(event.event_date)} •{" "}
                      {normalizeTime(event.start_time)} •{" "}
                      {event.location}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "Składki" && (
          <>
            <div style={eyebrowStyle}>Składka członkowska</div>
            <h2 style={{ marginTop: 5 }}>
              Rok {new Date().getFullYear()}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 9,
              }}
            >
              {[1, 2, 3, 4].map((quarter) => {
                const due = childDue(
                  new Date().getFullYear(),
                  quarter
                );

                return (
                  <div
                    key={`parent-due-${quarter}`}
                    style={{
                      ...cardStyle,
                      boxShadow: "none",
                      background: due?.paid
                        ? "#f1f7f2"
                        : "#fff8f8",
                      border: due?.paid
                        ? "1px solid #a9bbaa"
                        : "1px solid #e1d0d2",
                    }}
                  >
                    <strong>{quarterLabel(quarter)}</strong>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        fontWeight: 900,
                        color: due?.paid
                          ? "#315d3e"
                          : "#8b2635",
                      }}
                    >
                      {due?.paid ? "OPŁACONA" : "NIEOPŁACONA"}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "Dokumenty" && (
          <>
            <div style={eyebrowStyle}>Pliki dla rodziców</div>
            <h2 style={{ marginTop: 5 }}>Dokumenty</h2>

            {documents.length === 0 ? (
              <div style={{ ...cardStyle, color: "#68736d" }}>
                Brak dokumentów.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {documents.map((item) => (
                  <div
                    key={`parent-doc-${item.id}`}
                    style={cardStyle}
                  >
                    <strong>{item.title}</strong>

                    {item.description && (
                      <p
                        style={{
                          color: "#5d6962",
                          lineHeight: 1.55,
                        }}
                      >
                        {item.description}
                      </p>
                    )}

                    <button
                      style={primaryStyle}
                      onClick={() => openDocument(item)}
                    >
                      Otwórz dokument
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <BottomNav
        tabs={["Moje", "Kalendarz", "Składki", "Dokumenty"]}
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
