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
    patrol: "",
    location: "Nora",
    customLocation: "",
    time: "17:30",
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
          .select("id, slot_id, patrol_id, reserved_by, created_at"),
      ]);

      if (patrolError) throw patrolError;
      if (slotError) throw slotError;
      if (reservationError) throw reservationError;

      const loadedPatrols =
        patrolData?.length > 0 ? patrolData : FALLBACK_PATROLS;

      setPatrols(loadedPatrols);

      const mapped = (reservationData || [])
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
            date: slot.slot_date,
            time: normalizeTime(slot.start_time),
            endTime: normalizeTime(slot.end_time),
            location: slot.location,
            notes: slot.notes,
            patrol: patrol?.name || "Zastęp",
            leader: patrol?.leader_name || "",
            isEvent: false,
          };
        })
        .filter(Boolean);

      const eventSlots = (slotData || [])
        .filter((slot) => slot.event_id)
        .map((slot) => ({
          id: `event-${slot.id}`,
          slotId: slot.id,
          eventId: slot.event_id,
          reservedBy: slot.created_by,
          date: slot.slot_date,
          time: normalizeTime(slot.start_time),
          endTime: normalizeTime(slot.end_time),
          location: slot.location,
          notes: slot.notes,
          patrol: slot.notes || "Wydarzenie",
          leader: "wydarzenie drużyny",
          isEvent: true,
        }));

      setReservations([...mapped, ...eventSlots]);

      if (!form.patrol && loadedPatrols.length > 0) {
        setForm((old) => ({
          ...old,
          patrol: loadedPatrols[0].name,
        }));
      }
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
        (membershipData || []).map((item) => Number(item.patrol_id))
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
      patrolId: patrols[0]?.id ? String(patrols[0].id) : "",
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
      alert(`Nie udało się usunąć wydarzenia.\n\n${error.message}`);
      return;
    }

    setEventDetails(null);

    await Promise.all([loadEvents(), loadSchedule()]);
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
    setMyPatrolIds([]);
    setActiveTab("Grafik");
  }

  function openReservation(time = "17:30", location = "Nora") {
    const firstPatrol =
      patrols[0]?.name || FALLBACK_PATROLS[0].name;

    setForm({
      patrol: firstPatrol,
      location: MAIN_LOCATIONS.includes(location)
        ? location
        : "Inne",
      customLocation: MAIN_LOCATIONS.includes(location)
        ? ""
        : location,
      time,
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

    const patrol = patrols.find(
      (item) => item.name === form.patrol
    );

    if (!patrol?.id) {
      alert("Nie udało się znaleźć tego zastępu w bazie.");
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

    const duplicatePatrol = reservations.some(
      (item) =>
        item.date === selectedDate &&
        item.time === form.time &&
        Number(item.patrolId) === Number(patrol.id)
    );

    if (duplicatePatrol) {
      alert("Ten zastęp jest już zapisany na tę godzinę.");
      return;
    }

    const occupied = reservations.some(
      (item) =>
        item.date === selectedDate &&
        item.time === form.time &&
        item.location.toLowerCase() ===
          finalLocation.toLowerCase()
    );

    if (occupied) {
      alert("Ten termin w tym miejscu jest już zajęty.");
      return;
    }

    setSaving(true);

    try {
      let slotId;

      const { data: existingSlots, error: findError } =
        await supabase
          .from("schedule_slots")
          .select("id")
          .eq("slot_date", selectedDate)
          .eq("start_time", `${form.time}:00`)
          .eq("location", finalLocation)
          .limit(1);

      if (findError) throw findError;

      if (existingSlots?.length) {
        slotId = existingSlots[0].id;
      } else {
        const { data: newSlot, error: slotError } =
          await supabase
            .from("schedule_slots")
            .insert({
              slot_date: selectedDate,
              start_time: `${form.time}:00`,
              end_time: `${addMinutes(form.time, 30)}:00`,
              location: finalLocation,
              created_by: session.user.id,
            })
            .select("id")
            .single();

        if (slotError) throw slotError;

        slotId = newSlot.id;
      }

      const { error: reservationError } = await supabase
        .from("schedule_reservations")
        .insert({
          slot_id: slotId,
          patrol_id: patrol.id,
          reserved_by: session.user.id,
        });

      if (reservationError) throw reservationError;

      setModalOpen(false);

      await loadSchedule();
    } catch (error) {
      console.error("Błąd zapisu:", error);

      if (
        error?.code === "23505" ||
        String(error?.message || "")
          .toLowerCase()
          .includes("duplicate")
      ) {
        alert("Ten termin został już zarezerwowany.");
      } else {
        alert(
          `Nie udało się zapisać rezerwacji.\n\n${
            error?.message || ""
          }`
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeReservation(reservation) {
    if (!reservation?.id || reservation.isEvent) return;

    const confirmed = window.confirm(
      `Anulować rezerwację ${reservation.patrol} — ${reservation.time}, ${reservation.location}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("schedule_reservations")
        .delete()
        .eq("id", reservation.id);

      if (error) throw error;

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
                        item.time === time &&
                        item.location === location
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

            {role === "admin" && (
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
            {eventDetails.whole_troop
              ? "CAŁA DRUŻYNA"
              : "WYDARZENIE ZASTĘPU"}
          </div>

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

              {role === "admin" && (
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
                role === "admin" ? "1fr 1fr" : "1fr",
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

            {role === "admin" && (
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
              <strong>Zastęp</strong>

              <select
                value={form.patrol}
                onChange={(event) =>
                  setForm({
                    ...form,
                    patrol: event.target.value,
                  })
                }
                style={inputStyle}
              >
                {patrols.map((patrol) => (
                  <option
                    key={patrol.id}
                    value={patrol.name}
                  >
                    {patrol.name} —{" "}
                    {patrol.leader_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <strong>Miejsce</strong>

              <select
                value={form.location}
                onChange={(event) =>
                  setForm({
                    ...form,
                    location: event.target.value,
                    customLocation:
                      event.target.value === "Inne"
                        ? form.customLocation
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

            {form.location === "Inne" && (
              <label>
                <strong>Wpisz miejsce</strong>

                <input
                  type="text"
                  value={form.customLocation}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      customLocation:
                        event.target.value,
                    })
                  }
                  placeholder="np. Orlik, Olszynki, szkoła..."
                  style={inputStyle}
                />
              </label>
            )}

            <label>
              <strong>Godzina</strong>

              <select
                value={form.time}
                onChange={(event) =>
                  setForm({
                    ...form,
                    time: event.target.value,
                  })
                }
                style={inputStyle}
              >
                {validTimes.map((time) => (
                  <option key={time} value={time}>
                    {time}–{addMinutes(time, 30)}
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
          Zaloguj się do swojej części drużyny.
        </p>

        <form
          onSubmit={login}
          style={{ display: "grid", gap: 15 }}
        >
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
            {loggingIn ? "Logowanie..." : "Zaloguj się"}
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
