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
    reserver: "whole",
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
      setRole(data?.role || "member");
    }

    setLoading(false);
  }

  async function loadSchedule() {
    setScheduleLoading(true);

    try {
      const [
        { data: patrolData, error: patrolError },
        { data: slotData, error: slotError },
        { data: reservationData, error: reservationError },
      ] = await Promise.all([
        supabase
          .from("patrols")
          .select("id, name, leader_name")
          .order("id"),

        supabase
          .from("schedule_slots")
          .select(
            "id, slot_date, start_time, end_time, location, notes, created_by, event_id"
          )
          .order("slot_date")
          .order("start_time"),

        supabase
          .from("schedule_reservations")
          .select(
            "id, slot_id, patrol_id, reserved_by, created_at, reservation_name, reservation_group"
          ),
      ]);

      if (patrolError) throw patrolError;
      if (slotError) throw slotError;
      if (reservationError) throw reservationError;

      const loadedPatrols =
        patrolData?.length > 0 ? patrolData : FALLBACK_PATROLS;

      setPatrols(loadedPatrols);

      const rawManual = (reservationData || [])
        .map((reservation) => {
          const slot = (slotData || []).find(
            (item) => Number(item.id) === Number(reservation.slot_id)
          );

          const patrol = (patrolData || []).find(
            (item) => Number(item.id) === Number(reservation.patrol_id)
          );

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
        const key = item.reservationGroup
          ? `group-${item.reservationGroup}`
          : `single-${item.id}`;

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      }

      for (const items of groups.values()) {
        items.sort((a, b) => a.time.localeCompare(b.time));

        const first = items[0];
        const last = items[items.length - 1];

        groupedManual.push({
          ...first,
          id: first.reservationGroup
            ? `group-${first.reservationGroup}`
            : first.id,
          reservationIds: items.map((item) => item.id),
          slotIds: items.map((item) => item.slotId),
          endTime: last.endTime,
        });
      }

      const eventGroups = new Map();

      for (const slot of (slotData || []).filter(
        (item) => item.event_id
      )) {
        const key = String(slot.event_id);

        if (!eventGroups.has(key)) eventGroups.set(key, []);
        eventGroups.get(key).push(slot);
      }

      const eventBlocks = [];

      for (const [eventId, slots] of eventGroups.entries()) {
        slots.sort((a, b) =>
          normalizeTime(a.start_time).localeCompare(
            normalizeTime(b.start_time)
          )
        );

        const first = slots[0];
        const last = slots[slots.length - 1];

        eventBlocks.push({
          id: `event-${eventId}`,
          slotId: first.id,
          slotIds: slots.map((slot) => slot.id),
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

      setReservations([...groupedManual, ...eventBlocks]);
    } catch (error) {
      console.error("Błąd pobierania grafiku:", error);

      alert(
        "Nie udało się pobrać Grafiku z bazy. Jeśli błąd się powtórzy, podeślij mi ekran."
      );
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
        (membershipData || []).map((item) =>
          Number(item.patrol_id)
        )
      );
    } catch (error) {
      console.error("Błąd pobierania wydarzeń:", error);
      alert("Nie udało się pobrać wydarzeń.");
    }
  }

  function openEventForm() {
    setEventForm({
      title: "",
      eventType: "zbiórka",
      audience: "whole",
      patrolId: patrols[0]?.id
        ? String(patrols[0].id)
        : "",
      date: selectedDate,
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

    setEventModalOpen(true);
  }

  async function saveEvent() {
    if (!session?.user || role !== "admin") return;

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

    if (
      eventForm.endTime &&
      eventForm.endTime <= eventForm.startTime
    ) {
      alert(
        "Godzina zakończenia musi być późniejsza niż rozpoczęcia."
      );
      return;
    }

    if (!finalLocation) {
      alert("Wpisz miejsce wydarzenia.");
      return;
    }

    if (
      eventForm.audience === "patrol" &&
      !eventForm.patrolId
    ) {
      alert("Wybierz zastęp.");
      return;
    }

    if (
      eventForm.hasPayment &&
      !eventForm.cost.trim()
    ) {
      alert("Wpisz kwotę płatności.");
      return;
    }

    setEventSaving(true);
    let createdEventId = null;

    try {
      const reservesRoom =
        MAIN_LOCATIONS.includes(finalLocation);

      const starts = reservesRoom
        ? halfHourStarts(
            eventForm.startTime,
            eventForm.endTime ||
              addMinutes(eventForm.startTime, 30)
          )
        : [];

      if (reservesRoom) {
        const {
          data: existingSlots,
          error: existingError,
        } = await supabase
          .from("schedule_slots")
          .select("id,start_time,location")
          .eq("slot_date", eventForm.date)
          .eq("location", finalLocation);

        if (existingError) throw existingError;

        const occupiedTimes = new Set(
          (existingSlots || []).map((slot) =>
            normalizeTime(slot.start_time)
          )
        );

        const conflict = starts.find((time) =>
          occupiedTimes.has(time)
        );

        if (conflict) {
          alert(
            `${finalLocation} jest już zajęty ${eventForm.date} o ${conflict}. Wydarzenie nie zostało zapisane.`
          );

          return;
        }
      }

      const { data: created, error: eventError } =
        await supabase
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
            description:
              eventForm.description.trim() || null,
            created_by: session.user.id,
            whole_troop:
              eventForm.audience === "whole",
            patrol_id:
              eventForm.audience === "patrol"
                ? Number(eventForm.patrolId)
                : null,
            what_to_bring:
              eventForm.bring.trim() || null,
            cost: eventForm.hasPayment
              ? eventForm.cost.trim()
              : null,
            payment_deadline:
              eventForm.hasPayment &&
              eventForm.paymentDeadline
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

      await Promise.all([
        loadEvents(),
        loadSchedule(),
      ]);
    } catch (error) {
      console.error(
        "Błąd zapisu wydarzenia:",
        error
      );

      if (createdEventId) {
        await supabase
          .from("events")
          .delete()
          .eq("id", createdEventId);
      }

      alert(
        `Nie udało się zapisać wydarzenia.\n\n${
          error?.message || ""
        }`
      );
    } finally {
      setEventSaving(false);
    }
  }

  async function deleteEvent(eventItem) {
    if (role !== "admin" || !eventItem?.id) return;

    const confirmed = window.confirm(
      `Usunąć wydarzenie „${eventItem.title}”?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventItem.id);

    if (error) {
      alert(
        `Nie udało się usunąć wydarzenia.\n\n${error.message}`
      );
      return;
    }

    setEventDetails(null);

    await Promise.all([
      loadEvents(),
      loadSchedule(),
    ]);
  }

  async function login(event) {
    event.preventDefault();

    setLoggingIn(true);
    setLoginError("");

    const { error } =
      await supabase.auth.signInWithPassword({
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
    setMyPatrolIds([]);
    setActiveTab("Grafik");
  }

  function openReservation(
    time = "17:30",
    location = "Nora"
  ) {
    setForm({
      reserver: "whole",
      location: MAIN_LOCATIONS.includes(location)
        ? location
        : "Inne",
      customLocation: MAIN_LOCATIONS.includes(location)
        ? ""
        : location,
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
    const date = new Date(
      `${value}T12:00:00`
    );

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

    const wholeTroop =
      form.reserver === "whole";

    const patrol = wholeTroop
      ? null
      : patrols.find(
          (item) =>
            String(item.id) ===
            String(form.reserver)
        );

    if (!wholeTroop && !patrol?.id) {
      alert(
        "Nie udało się znaleźć tego zastępu w bazie."
      );
      return;
    }

    const finalLocation =
      form.location === "Inne"
        ? form.customLocation.trim()
        : form.location;

    if (!finalLocation) {
      alert("Wpisz miejsce zbiórki.");
      return;
    }

    if (
      !form.startTime ||
      !form.endTime ||
      form.endTime <= form.startTime
    ) {
      alert(
        "Godzina zakończenia musi być późniejsza niż rozpoczęcia."
      );
      return;
    }

    const starts = halfHourStarts(
      form.startTime,
      form.endTime
    );

    const valid = new Set(
      availableTimesForDate(selectedDate)
    );

    if (
      !starts.length ||
      starts.some((time) => !valid.has(time))
    ) {
      alert(
        "Wybrany przedział wykracza poza godziny dostępne w Grafiku."
      );
      return;
    }

    setSaving(true);

    const createdSlotIds = [];
    const createdReservationIds = [];

    try {
      const {
        data: existingSlots,
        error: existingError,
      } = await supabase
        .from("schedule_slots")
        .select("id,start_time,location")
        .eq("slot_date", selectedDate)
        .eq("location", finalLocation);

      if (existingError) throw existingError;

      const occupied = new Set(
        (existingSlots || []).map((slot) =>
          normalizeTime(slot.start_time)
        )
      );

      const conflict = starts.find((time) =>
        occupied.has(time)
      );

      if (conflict) {
        alert(
          `${finalLocation} jest już zajęty o ${conflict}. Wybierz inny przedział.`
        );
        return;
      }

      const groupId = crypto.randomUUID();

      const reservationName = wholeTroop
        ? "Cała drużyna"
        : patrol.name;

      const {
        data: newSlots,
        error: slotError,
      } = await supabase
        .from("schedule_slots")
        .insert(
          starts.map((time) => ({
            slot_date: selectedDate,
            start_time: `${time}:00`,
            end_time: `${addMinutes(
              time,
              30
            )}:00`,
            location: finalLocation,
            notes: reservationName,
            created_by: session.user.id,
          }))
        )
        .select("id,start_time");

      if (slotError) throw slotError;

      createdSlotIds.push(
        ...(newSlots || []).map(
          (slot) => slot.id
        )
      );

      const {
        data: newReservations,
        error: reservationError,
      } = await supabase
        .from("schedule_reservations")
        .insert(
          (newSlots || []).map((slot) => ({
            slot_id: slot.id,
            patrol_id: wholeTroop
              ? null
              : patrol.id,
            reserved_by: session.user.id,
            reservation_name:
              reservationName,
            reservation_group: groupId,
          }))
        )
        .select("id");

      if (reservationError)
        throw reservationError;

      createdReservationIds.push(
        ...(newReservations || []).map(
          (item) => item.id
        )
      );

      setModalOpen(false);

      await loadSchedule();
    } catch (error) {
      console.error("Błąd zapisu:", error);

      if (createdReservationIds.length) {
        await supabase
          .from("schedule_reservations")
          .delete()
          .in(
            "id",
            createdReservationIds
          );
      }

      if (createdSlotIds.length) {
        await supabase
          .from("schedule_slots")
          .delete()
          .in("id", createdSlotIds);
      }

      alert(
        `Nie udało się zapisać rezerwacji.\n\n${
          error?.message || ""
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeReservation(
    reservation
  ) {
    if (
      !reservation?.id ||
      reservation.isEvent
    )
      return;

    const confirmed = window.confirm(
      `Anulować rezerwację ${reservation.patrol} — ${reservation.time}–${reservation.endTime}, ${reservation.location}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("schedule_reservations")
        .delete()
        .in(
          "id",
          reservation.reservationIds || [
            reservation.id,
          ]
        );

      if (error) throw error;

      setDetailsOpen(null);
      await loadSchedule();
    } catch (error) {
      console.error(
        "Błąd usuwania:",
        error
      );

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

  const visibleEvents = events
    .filter((item) => item.event_date >= today)
    .filter((item) => {
      if (role === "admin") return true;
      if (item.whole_troop) return true;

      return myPatrolIds.includes(Number(item.patrol_id));
    });

  const ownReservations = reservations.filter(
    (item) =>
      !item.isEvent &&
      item.reservedBy === session.user.id &&
      item.date >= today
  );

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
          role === "admin"
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
                <div style={eyebrowStyle}>Grafik harcówki</div>

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

                  const date = new Date(`${value}T12:00:00`);

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
              {["Wszystkie", "Nora", "Basecamp", "Inne"].map(
                (location) => (
                  <button
                    key={location}
                    onClick={() => setLocationFilter(location)}
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
                        locationFilter === location ? 700 : 500,
                    }}
                  >
                    {location}
                  </button>
                )
              )}
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

            {!scheduleLoading && dayReservations.length === 0 && (
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
                      : reservation.patrol === "Cała drużyna"
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
                        : reservation.leader ||
                          "rezerwacja harcówki"}
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
                      (item) => {
                        if (
                          item.date !== selectedDate ||
                          item.location !== location
                        ) {
                          return false;
                        }

                        return (
                          time >= item.time &&
                          time < item.endTime
                        );
                      }
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
                <div style={eyebrowStyle}>Twoje centrum</div>
                <h2 style={{ margin: "4px 0 0" }}>
                  Co mnie czeka?
                </h2>
              </div>

              {role === "admin" && (
                <button
                  style={primaryStyle}
                  onClick={openEventForm}
                >
                  + Wydarzenie
                </button>
              )}
            </div>

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
                          addMinutes(reservation.time, 30)}
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
                    onClick={() => setEventDetails(eventItem)}
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
                        : role === "admin"
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
                      📅 {formatDate(eventItem.event_date)}
                      <br />

                      🕐 {normalizeTime(eventItem.start_time)}
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
          <SimplePage
            title="Wyjazdy"
            text="Biwaki, rajdy, zawody i wyprawy."
          />
        )}

        {activeTab === "Zadania" && (
          <SimplePage
            title="Zadania"
            text="Zadania drużyny: kto, co i do kiedy."
          />
        )}

        {activeTab === "Więcej" && (
          <>
            <h2>Więcej</h2>

            <div style={{ display: "grid", gap: 10 }}>
              {[
                "Ogłoszenia",
                "Kadra",
                "Dokumenty",
                "Ustawienia",
              ].map((item) => (
                <button
                  key={item}
                  style={{
                    ...cardStyle,
                    border: 0,
                    textAlign: "left",
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: "pointer",
                    color: "#17231c",
                  }}
                  onClick={() =>
                    alert(
                      `${item} — moduł podepniemy później.`
                    )
                  }
                >
                  {item} →
                </button>
              ))}
            </div>
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

  const visibleEvents = events
    .filter((item) => item.event_date >= today)
    .filter((item) => {
      if (role === "admin") return true;
      if (item.whole_troop) return true;

      return myPatrolIds.includes(Number(item.patrol_id));
    });

  const ownReservations = reservations.filter(
    (item) =>
      !item.isEvent &&
      item.reservedBy === session.user.id &&
      item.date >= today
  );

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
          role === "admin"
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
                <div style={eyebrowStyle}>Grafik harcówki</div>

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

                  const date = new Date(`${value}T12:00:00`);

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
              {["Wszystkie", "Nora", "Basecamp", "Inne"].map(
                (location) => (
                  <button
                    key={location}
                    onClick={() => setLocationFilter(location)}
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
                        locationFilter === location ? 700 : 500,
                    }}
                  >
                    {location}
                  </button>
                )
              )}
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

            {!scheduleLoading && dayReservations.length === 0 && (
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
                      : reservation.patrol === "Cała drużyna"
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
                        : reservation.leader ||
                          "rezerwacja harcówki"}
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
                      (item) => {
                        if (
                          item.date !== selectedDate ||
                          item.location !== location
                        ) {
                          return false;
                        }

                        return (
                          time >= item.time &&
                          time < item.endTime
                        );
                      }
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
                <div style={eyebrowStyle}>Twoje centrum</div>
                <h2 style={{ margin: "4px 0 0" }}>
                  Co mnie czeka?
                </h2>
              </div>

              {role === "admin" && (
                <button
                  style={primaryStyle}
                  onClick={openEventForm}
                >
                  + Wydarzenie
                </button>
              )}
            </div>

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
                          addMinutes(reservation.time, 30)}
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
                    onClick={() => setEventDetails(eventItem)}
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
                        : role === "admin"
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
                      📅 {formatDate(eventItem.event_date)}
                      <br />

                      🕐 {normalizeTime(eventItem.start_time)}
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
          <SimplePage
            title="Wyjazdy"
            text="Biwaki, rajdy, zawody i wyprawy."
          />
        )}

        {activeTab === "Zadania" && (
          <SimplePage
            title="Zadania"
            text="Zadania drużyny: kto, co i do kiedy."
          />
        )}

        {activeTab === "Więcej" && (
          <>
            <h2>Więcej</h2>

            <div style={{ display: "grid", gap: 10 }}>
              {[
                "Ogłoszenia",
                "Kadra",
                "Dokumenty",
                "Ustawienia",
              ].map((item) => (
                <button
                  key={item}
                  style={{
                    ...cardStyle,
                    border: 0,
                    textAlign: "left",
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: "pointer",
                    color: "#17231c",
                  }}
                  onClick={() =>
                    alert(
                      `${item} — moduł podepniemy później.`
                    )
                  }
                >
                  {item} →
                </button>
              ))}
            </div>
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
