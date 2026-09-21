"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PATROLS = [
  { name: "H Falco", leader: "Filip" },
  { name: "H Świetliki", leader: "Lilianna" },
  { name: "HS Męski", leader: "Karol" },
  { name: "HS Damski", leader: "Basia" },
  { name: "Wędrownicy", leader: "Tymon" },
];

const MAIN_LOCATIONS = ["Nora", "Basecamp"];

const STARTING_RESERVATIONS = [
  {
    id: 1,
    date: "2026-09-26",
    time: "17:30",
    patrol: "H Falco",
    leader: "Filip",
    location: "Nora",
  },
  {
    id: 2,
    date: "2026-09-26",
    time: "18:00",
    patrol: "H Świetliki",
    leader: "Lilianna",
    location: "Basecamp",
  },
  {
    id: 3,
    date: "2026-09-26",
    time: "19:00",
    patrol: "Wędrownicy",
    leader: "Tymon",
    location: "Nora",
  },
  {
    id: 4,
    date: "2026-09-21",
    time: "17:30",
    patrol: "HS Męski",
    leader: "Karol",
    location: "Basecamp",
  },
  {
    id: 5,
    date: "2026-09-24",
    time: "18:00",
    patrol: "HS Damski",
    leader: "Basia",
    location: "Orlik",
  },
];

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
  const [hours, mins] = time.split(":").map(Number);
  const date = new Date();

  date.setHours(hours, mins + minutes, 0, 0);

  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
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

  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
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
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState("Grafik");

  const [selectedDate, setSelectedDate] =
    useState("2026-09-26");

  const [calendarYear, setCalendarYear] =
    useState(2026);

  const [calendarMonth, setCalendarMonth] =
    useState(8);

  const [locationFilter, setLocationFilter] =
    useState("Wszystkie");

  const [reservations, setReservations] = useState(
    STARTING_RESERVATIONS
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(null);

  const [form, setForm] = useState({
    patrol: "H Falco",
    location: "Nora",
    customLocation: "",
    time: "17:30",
  });

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);

        if (newSession?.user) {
          await loadRole(newSession.user.id);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      console.error(error);
      setRole("member");
    } else {
      setRole(data?.role || "member");
    }

    setLoading(false);
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
    setActiveTab("Grafik");
  }

  function openReservation(
    time = "17:30",
    location = "Nora"
  ) {
    setForm({
      patrol: "H Falco",
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

  function saveReservation() {
    const patrol = PATROLS.find(
      (item) => item.name === form.patrol
    );

    const finalLocation =
      form.location === "Inne"
        ? form.customLocation.trim()
        : form.location;

    if (!finalLocation) {
      alert("Wpisz miejsce zbiórki.");
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
      alert(
        "Ten termin w tym miejscu jest już zajęty."
      );
      return;
    }

    setReservations([
      ...reservations,
      {
        id: Date.now(),
        date: selectedDate,
        time: form.time,
        patrol: patrol.name,
        leader: patrol.leader,
        location: finalLocation,
      },
    ]);

    setModalOpen(false);
  }

  function removeReservation(id) {
    setReservations(
      reservations.filter((item) => item.id !== id)
    );

    setDetailsOpen(null);
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
    return (
      <ParentApp
        session={session}
        logout={logout}
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

            {dayReservations.length === 0 && (
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
                  onClick={() =>
                    setDetailsOpen(reservation)
                  }
                  style={{
                    ...cardStyle,
                    width: "100%",
                    border: 0,
                    borderLeft: "5px solid #8b2635",
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
                    {addMinutes(reservation.time, 30)}
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
                      {reservation.leader} • zastępowy /
                      lider
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
              {TIMES.filter((time) => {
                const hour = Number(time.slice(0, 2));

                const date = new Date(
                  `${selectedDate}T12:00:00`
                );

                const weekend =
                  date.getDay() === 0 ||
                  date.getDay() === 6;

                if (
                  !weekend &&
                  (hour < 12 || hour >= 22)
                ) {
                  return false;
                }

                if (
                  weekend &&
                  (hour < 7 || hour >= 22)
                ) {
                  return false;
                }

                return true;
              })
                .slice(0, 20)
                .flatMap((time) => {
                  if (locationFilter === "Inne") {
                    return [];
                  }

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
                          border:
                            "2px dashed #ccd2cd",
                          borderRadius: 16,
                          padding: 14,
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "space-between",
                          gap: 10,
                        }}
                      >
                        <div>
                          <strong>
                            {time}–
                            {addMinutes(time, 30)}
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
                            openReservation(
                              time,
                              location
                            )
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
                    "17:30",
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
          <SimplePage
            title="Moje"
            text="Twoje najbliższe zbiórki, wyjazdy, rezerwacje i zadania będą tutaj."
          />
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

      {modalOpen && (
        <ModalBackground
          close={() => setModalOpen(false)}
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
                {PATROLS.map((patrol) => (
                  <option key={patrol.name}>
                    {patrol.name}
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
                {TIMES.map((time) => (
                  <option key={time}>{time}</option>
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
                onClick={() => setModalOpen(false)}
              >
                Anuluj
              </button>

              <button
                style={primaryStyle}
                onClick={saveReservation}
              >
                Zapisz rezerwację
              </button>
            </div>
          </div>
        </ModalBackground>
      )}

      {detailsOpen && (
        <ModalBackground
          close={() => setDetailsOpen(null)}
        >
          <div style={eyebrowStyle}>
            Rezerwacja
          </div>

          <h2>{detailsOpen.patrol}</h2>

          <p>
            <strong>
              {detailsOpen.time}–
              {addMinutes(detailsOpen.time, 30)}
            </strong>
            <br />
            📍 {detailsOpen.location}
            <br />
            {detailsOpen.leader} • zastępowy / lider
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
              onClick={() => setDetailsOpen(null)}
            >
              Zamknij
            </button>

            <button
              style={primaryStyle}
              onClick={() =>
                removeReservation(detailsOpen.id)
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
        background:
          "linear-gradient(160deg, #102a20, #214c38)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily:
          "Inter, Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#f5f3eb",
          borderRadius: 26,
          padding: "32px 25px",
          boxShadow:
            "0 20px 60px rgba(0,0,0,.25)",
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

        <h1
          style={{
            color: "#17231c",
            marginBottom: 5,
          }}
        >
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
            {loggingIn
              ? "Logowanie..."
              : "Zaloguj się"}
          </button>
        </form>
      </div>
    </main>
  );
}

function ParentApp({ session, logout }) {
  const [tab, setTab] = useState("Moje");

  const upcoming = [...PARENT_EVENTS].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

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

            <h2
              style={{
                marginTop: 5,
                marginBottom: 18,
              }}
            >
              Co, kiedy i gdzie?
            </h2>

            <div style={{ display: "grid", gap: 12 }}>
              {upcoming.map((event, index) => (
                <div
                  key={event.id}
                  style={{
                    ...cardStyle,
                    borderLeft:
                      index === 0
                        ? "5px solid #8b2635"
                        : "5px solid #607b54",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: "#8b2635",
                      fontWeight: 900,
                    }}
                  >
                    {index === 0
                      ? "Najbliższe"
                      : event.type}
                  </div>

                  <h3
                    style={{
                      margin: "7px 0 10px",
                      fontSize: 20,
                    }}
                  >
                    {event.title}
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      fontSize: 14,
                    }}
                  >
                    <div>
                      📅 {formatDate(event.date)}
                    </div>

                    <div>🕐 {event.time}</div>

                    <div>📍 {event.location}</div>

                    <div>🧭 {event.info}</div>

                    {event.bring && (
                      <div>
                        🎒 <strong>Zabierz:</strong>{" "}
                        {event.bring}
                      </div>
                    )}

                    {event.cost && (
                      <div>
                        💰 <strong>Koszt:</strong>{" "}
                        {event.cost}
                      </div>
                    )}

                    {event.deadline && (
                      <div>
                        📄{" "}
                        <strong>
                          Termin wpłaty/zgody:
                        </strong>{" "}
                        {event.deadline}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                ...cardStyle,
                marginTop: 18,
                background: "#fffaf0",
              }}
            >
              <strong>Ważne</strong>

              <p
                style={{
                  marginBottom: 0,
                  color: "#657069",
                }}
              >
                Tutaj będą pojawiać się zmiany
                godzin, miejsc, terminy zgód i inne
                ważne informacje dla rodziców.
              </p>
            </div>
          </>
        )}

        {tab === "Kalendarz" && (
          <ParentCalendar />
        )}

        {tab === "Dokumenty" && (
          <>
            <div style={eyebrowStyle}>
              Strefa rodzica
            </div>

            <h2 style={{ marginTop: 5 }}>
              Dokumenty
            </h2>

            <div style={{ display: "grid", gap: 10 }}>
              {[
                "Zgody na wyjazdy",
                "Regulaminy",
                "Karty uczestnika",
                "Informacje organizacyjne",
              ].map((document) => (
                <button
                  key={document}
                  style={{
                    ...cardStyle,
                    border: 0,
                    textAlign: "left",
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: "pointer",
                    color: "#17231c",
                  }}
                  onClick={() =>
                    alert(
                      `${document} — tutaj podepniemy właściwe pliki.`
                    )
                  }
                >
                  📄 {document} →
                </button>
              ))}
            </div>
          </>
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

function ParentCalendar() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(8);
  const [selected, setSelected] =
    useState("2026-09-26");

  const days = getCalendarDays(year, month);

  const monthName = new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));

  function changeMonth(amount) {
    const date = new Date(year, month + amount, 1);

    setYear(date.getFullYear());
    setMonth(date.getMonth());
  }

  const events = PARENT_EVENTS.filter(
    (event) => event.date === selected
  );

  return (
    <>
      <div style={eyebrowStyle}>
        Kalendarz
      </div>

      <h2 style={{ marginTop: 5 }}>
        Terminy
      </h2>

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 15,
          }}
        >
          <button
            style={secondaryStyle}
            onClick={() => changeMonth(-1)}
          >
            ←
          </button>

          <strong
            style={{ textTransform: "capitalize" }}
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
            "Pn",
            "Wt",
            "Śr",
            "Cz",
            "Pt",
            "So",
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

          {days.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`blank-${index}`}
                  style={{ minHeight: 55 }}
                />
              );
            }

            const value = dateToString(date);

            const hasEvent = PARENT_EVENTS.some(
              (event) => event.date === value
            );

            const isSelected = selected === value;

            return (
              <button
                key={value}
                onClick={() => setSelected(value)}
                style={{
                  minHeight: 55,
                  border: 0,
                  borderRadius: 13,
                  cursor: "pointer",
                  background: isSelected
                    ? "#173b2b"
                    : "transparent",
                  color: isSelected
                    ? "white"
                    : "#17231c",
                  fontWeight: isSelected
                    ? 900
                    : 600,
                }}
              >
                {date.getDate()}

                <div
                  style={{
                    height: 8,
                    marginTop: 3,
                  }}
                >
                  {hasEvent && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: isSelected
                          ? "#f3d899"
                          : "#8b2635",
                      }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <h3>Wybrany dzień</h3>

      {events.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            color: "#68736d",
          }}
        >
          Brak wydarzeń.
        </div>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            style={{
              ...cardStyle,
              marginBottom: 10,
            }}
          >
            <strong>{event.title}</strong>

            <div
              style={{
                marginTop: 7,
                color: "#657069",
                lineHeight: 1.6,
              }}
            >
              {event.time}
              <br />
              📍 {event.location}
            </div>
          </div>
        ))
      )}
    </>
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
          gap: 10,
          marginBottom: 18,
        }}
      >
        <button
          style={secondaryStyle}
          onClick={() => changeMonth(-1)}
        >
          ←
        </button>

        <div
          style={{
            textAlign: "center",
            fontWeight: 900,
            fontSize: 18,
            textTransform: "capitalize",
          }}
        >
          {monthName}
        </div>

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

          const dateString = dateToString(date);
          const isSelected =
            dateString === selectedDate;

          const items = reservations.filter(
            (item) => item.date === dateString
          );

          const hasNora = items.some(
            (item) => item.location === "Nora"
          );

          const hasBasecamp = items.some(
            (item) => item.location === "Basecamp"
          );

          const hasOther = items.some(
            (item) =>
              !MAIN_LOCATIONS.includes(item.location)
          );

          return (
            <button
              key={dateString}
              onClick={() =>
                selectCalendarDay(date)
              }
              style={{
                border: 0,
                background: isSelected
                  ? "#173b2b"
                  : "transparent",
                color: isSelected
                  ? "white"
                  : "#17231c",
                borderRadius: 14,
                minHeight: 55,
                cursor: "pointer",
                fontWeight: isSelected ? 900 : 600,
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
                {hasNora && (
                  <Dot
                    color={
                      isSelected
                        ? "#f1a5ae"
                        : "#9d293b"
                    }
                  />
                )}

                {hasBasecamp && (
                  <Dot
                    color={
                      isSelected
                        ? "#bcd3b2"
                        : "#607b54"
                    }
                  />
                )}

                {hasOther && (
                  <Dot
                    color={
                      isSelected
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
        <LegendDot color="#9d293b" label="Nora" />
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
              border: "1px solid rgba(255,255,255,.3)",
              background: "rgba(255,255,255,.08)",
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
