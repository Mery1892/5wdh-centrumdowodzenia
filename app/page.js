"use client";

import { useState } from "react";

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

export default function Home() {
  const [activeTab, setActiveTab] = useState("Grafik");

  const [selectedDate, setSelectedDate] =
    useState("2026-09-26");

  const initialDate = new Date("2026-09-26T12:00:00");

  const [calendarYear, setCalendarYear] = useState(
    initialDate.getFullYear()
  );

  const [calendarMonth, setCalendarMonth] = useState(
    initialDate.getMonth()
  );

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

  function openReservation(
    time = "17:30",
    location = "Nora"
  ) {
    setForm({
      patrol: "H Falco",
      location:
        MAIN_LOCATIONS.includes(location)
          ? location
          : "Inne",
      customLocation:
        MAIN_LOCATIONS.includes(location)
          ? ""
          : location,
      time,
    });

    setModalOpen(true);
  }

  function selectCalendarDay(date) {
    const newDate = dateToString(date);

    setSelectedDate(newDate);
    setCalendarYear(date.getFullYear());
    setCalendarMonth(date.getMonth());
  }

  function changeDay(days) {
    const newDate = moveDate(selectedDate, days);
    const date = new Date(`${newDate}T12:00:00`);

    setSelectedDate(newDate);
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

  const dayReservations = reservations
    .filter((item) => item.date === selectedDate)
    .filter((item) => {
      if (locationFilter === "Wszystkie") {
        return true;
      }

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

  const styles = {
    app: {
      minHeight: "100vh",
      background: "#f2f0e7",
      color: "#17231c",
      fontFamily:
        "Inter, Arial, Helvetica, sans-serif",
      paddingBottom: "90px",
    },

    header: {
      background:
        "linear-gradient(135deg, #122d22 0%, #214c38 100%)",
      color: "white",
      padding: "28px 20px 32px",
      borderRadius: "0 0 30px 30px",
    },

    container: {
      maxWidth: "900px",
      margin: "0 auto",
    },

    card: {
      background: "white",
      borderRadius: "18px",
      padding: "17px",
      boxShadow: "0 4px 18px rgba(0,0,0,.055)",
    },

    primary: {
      border: 0,
      background: "#8b2635",
      color: "white",
      borderRadius: "13px",
      padding: "11px 15px",
      fontWeight: 700,
      cursor: "pointer",
    },

    secondary: {
      border: "1px solid #d6dbd6",
      background: "white",
      color: "#1c382b",
      borderRadius: "13px",
      padding: "10px 14px",
      cursor: "pointer",
    },
  };

  return (
    <main style={styles.app}>
      <header style={styles.header}>
        <div style={styles.container}>
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
            Drużyna w jednym miejscu.
          </div>
        </div>
      </header>

      <section
        style={{
          ...styles.container,
          padding: "22px 15px",
        }}
      >
        {activeTab === "Grafik" && (
          <>
            {/* KALENDARZ MIESIĘCZNY */}

            <div
              style={{
                ...styles.card,
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
                  style={styles.secondary}
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
                  style={styles.secondary}
                  onClick={() => changeMonth(1)}
                >
                  →
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  textAlign: "center",
                  marginBottom: 7,
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
                      padding: "5px 0",
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 5,
                }}
              >
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

                  const reservationsThisDay =
                    reservations.filter(
                      (item) =>
                        item.date === dateString
                    );

                  const hasNora =
                    reservationsThisDay.some(
                      (item) =>
                        item.location === "Nora"
                    );

                  const hasBasecamp =
                    reservationsThisDay.some(
                      (item) =>
                        item.location === "Basecamp"
                    );

                  const hasOther =
                    reservationsThisDay.some(
                      (item) =>
                        !MAIN_LOCATIONS.includes(
                          item.location
                        )
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
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 5,
                        fontWeight: isSelected
                          ? 900
                          : 600,
                      }}
                    >
                      <span>{date.getDate()}</span>

                      <div
                        style={{
                          height: 7,
                          display: "flex",
                          gap: 3,
                          justifyContent: "center",
                        }}
                      >
                        {hasNora && (
                          <span
                            title="Nora"
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: isSelected
                                ? "#f1a5ae"
                                : "#9d293b",
                            }}
                          />
                        )}

                        {hasBasecamp && (
                          <span
                            title="Basecamp"
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: isSelected
                                ? "#bcd3b2"
                                : "#607b54",
                            }}
                          />
                        )}

                        {hasOther && (
                          <span
                            title="Inne miejsce"
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: isSelected
                                ? "#f3d899"
                                : "#b98a2f",
                            }}
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
                  flexWrap: "wrap",
                  fontSize: 11,
                  color: "#68736d",
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

            {/* WIDOK KONKRETNEGO DNIA */}

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
                <div
                  style={{
                    textTransform: "uppercase",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#68746d",
                    letterSpacing: 1,
                  }}
                >
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
                style={styles.primary}
                onClick={() => openReservation()}
              >
                + Rezerwacja
              </button>
            </div>

            {/* DZIEŃ WSTECZ / DALEJ */}

            <div
              style={{
                ...styles.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <button
                style={styles.secondary}
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
                  setCalendarYear(
                    date.getFullYear()
                  );
                  setCalendarMonth(
                    date.getMonth()
                  );
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
                style={styles.secondary}
                onClick={() => changeDay(1)}
              >
                →
              </button>
            </div>

            {/* FILTRY */}

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

            {/* ZAJĘTE TERMINY */}

            {dayReservations.length === 0 && (
              <div
                style={{
                  ...styles.card,
                  textAlign: "center",
                  color: "#68736d",
                  marginBottom: 12,
                }}
              >
                Brak rezerwacji na ten dzień.
              </div>
            )}

            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {dayReservations.map(
                (reservation) => (
                  <button
                    key={reservation.id}
                    onClick={() =>
                      setDetailsOpen(
                        reservation
                      )
                    }
                    style={{
                      ...styles.card,
                      width: "100%",
                      border: 0,
                      borderLeft:
                        "5px solid #8b2635",
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
                      {addMinutes(
                        reservation.time,
                        30
                      )}
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
                        {reservation.leader} •
                        zastępowy / lider
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
                )
              )}
            </div>

            {/* WOLNE TERMINY */}

            <h3
              style={{
                margin: "26px 0 10px",
              }}
            >
              Wolne terminy
            </h3>

            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {TIMES.filter((time) => {
                const hour = Number(
                  time.slice(0, 2)
                );

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
                .map((time) => {
                  let locationsToShow = [];

                  if (
                    locationFilter ===
                    "Wszystkie"
                  ) {
                    locationsToShow = [
                      "Nora",
                      "Basecamp",
                    ];
                  } else if (
                    locationFilter === "Inne"
                  ) {
                    return null;
                  } else {
                    locationsToShow = [
                      locationFilter,
                    ];
                  }

                  return locationsToShow.map(
                    (location) => {
                      const occupied =
                        reservations.some(
                          (item) =>
                            item.date ===
                              selectedDate &&
                            item.time ===
                              time &&
                            item.location ===
                              location
                        );

                      if (occupied) {
                        return null;
                      }

                      return (
                        <div
                          key={`${time}-${location}`}
                          style={{
                            border:
                              "2px dashed #ccd2cd",
                            borderRadius: 16,
                            padding: 14,
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap: 10,
                          }}
                        >
                          <div>
                            <strong>
                              {time}–
                              {addMinutes(
                                time,
                                30
                              )}
                            </strong>

                            <div
                              style={{
                                fontSize: 13,
                                color:
                                  "#6c756f",
                                marginTop: 3,
                              }}
                            >
                              {location} •
                              wolne
                            </div>
                          </div>

                          <button
                            style={
                              styles.secondary
                            }
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
                    }
                  );
                })}

              {/* DOWOLNE MIEJSCE */}

              <button
                onClick={() =>
                  openReservation(
                    "17:30",
                    "Inne miejsce"
                  )
                }
                style={{
                  border:
                    "2px dashed #b98a2f",
                  borderRadius: 16,
                  padding: 15,
                  background: "#fffdf7",
                  color: "#72571e",
                  cursor: "pointer",
                  fontWeight: 800,
                  textAlign: "center",
                }}
              >
                + Zarezerwuj inne miejsce
              </button>
            </div>
          </>
        )}

        {/* MOJE */}

        {activeTab === "Moje" && (
          <>
            <h2>Moje</h2>

            <p style={{ color: "#66736c" }}>
              Twoje najbliższe rezerwacje i
              sprawy.
            </p>

            <div style={styles.card}>
              <strong>
                Najbliższe działania
              </strong>

              <p style={{ color: "#69746d" }}>
                Tutaj podepniemy rezerwacje
                użytkownika, zadania i wyjazdy.
              </p>
            </div>
          </>
        )}

        {/* WYJAZDY */}

        {activeTab === "Wyjazdy" && (
          <>
            <h2>Wyjazdy</h2>

            <p style={{ color: "#66736c" }}>
              Biwaki, rajdy, zawody i wyprawy.
            </p>

            <div style={styles.card}>
              <strong>+ Nowy wyjazd</strong>

              <p style={{ color: "#69746d" }}>
                Tu pojawią się terminy,
                uczestnicy, transport, koszty,
                wpłaty i zgody.
              </p>
            </div>
          </>
        )}

        {/* ZADANIA */}

        {activeTab === "Zadania" && (
          <>
            <h2>Zadania</h2>

            <p style={{ color: "#66736c" }}>
              Kto, co i do kiedy.
            </p>

            <div style={styles.card}>
              <strong>
                Brak aktywnych zadań
              </strong>

              <p style={{ color: "#69746d" }}>
                Tutaj podepniemy zadania kadry.
              </p>
            </div>
          </>
        )}

        {/* WIĘCEJ */}

        {activeTab === "Więcej" && (
          <>
            <h2>Więcej</h2>

            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {[
                "Ogłoszenia",
                "Kadra",
                "Dokumenty",
                "Ustawienia",
              ].map((item) => (
                <button
                  key={item}
                  style={{
                    ...styles.card,
                    border: 0,
                    textAlign: "left",
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: "pointer",
                    color: "#17231c",
                  }}
                  onClick={() =>
                    alert(
                      `${item} — ten moduł podepniemy później.`
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

      {/* DOLNE MENU */}

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background:
            "rgba(255,255,255,.97)",
          borderTop:
            "1px solid #dde1dd",
          display: "flex",
          justifyContent: "space-around",
          zIndex: 50,
          padding: "11px 3px 14px",
          boxShadow:
            "0 -5px 18px rgba(0,0,0,.04)",
        }}
      >
        {[
          "Grafik",
          "Moje",
          "Wyjazdy",
          "Zadania",
          "Więcej",
        ].map((tab) => (
          <button
            key={tab}
            onClick={() =>
              setActiveTab(tab)
            }
            style={{
              border: 0,
              background: "transparent",
              color:
                activeTab === tab
                  ? "#8b2635"
                  : "#68736d",
              fontWeight:
                activeTab === tab
                  ? 800
                  : 500,
              cursor: "pointer",
              padding: "6px 8px",
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* NOWA REZERWACJA */}

      {modalOpen && (
        <div
          onClick={() =>
            setModalOpen(false)
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(10,20,15,.58)",
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
              borderRadius:
                "26px 26px 0 0",
              padding:
                "23px 18px 28px",
            }}
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

            <div
              style={{
                display: "grid",
                gap: 15,
              }}
            >
              {/* ZASTĘP */}

              <label>
                <strong>Zastęp</strong>

                <select
                  value={form.patrol}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      patrol:
                        event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {PATROLS.map(
                    (patrol) => (
                      <option
                        key={patrol.name}
                      >
                        {patrol.name}
                      </option>
                    )
                  )}
                </select>
              </label>

              {/* MIEJSCE */}

              <label>
                <strong>Miejsce</strong>

                <select
                  value={form.location}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      location:
                        event.target.value,
                      customLocation:
                        event.target.value ===
                        "Inne"
                          ? form.customLocation
                          : "",
                    })
                  }
                  style={inputStyle}
                >
                  <option value="Nora">
                    Nora
                  </option>

                  <option value="Basecamp">
                    Basecamp
                  </option>

                  <option value="Inne">
                    Inne miejsce...
                  </option>
                </select>
              </label>

              {/* WŁASNE MIEJSCE */}

              {form.location === "Inne" && (
                <label>
                  <strong>
                    Wpisz miejsce
                  </strong>

                  <input
                    type="text"
                    value={
                      form.customLocation
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        customLocation:
                          event.target
                            .value,
                      })
                    }
                    placeholder="np. Orlik, Olszynki, szkoła..."
                    style={inputStyle}
                  />
                </label>
              )}

              {/* GODZINA */}

              <label>
                <strong>Godzina</strong>

                <select
                  value={form.time}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      time:
                        event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {TIMES.map((time) => (
                    <option key={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 9,
                  marginTop: 5,
                }}
              >
                <button
                  style={styles.secondary}
                  onClick={() =>
                    setModalOpen(false)
                  }
                >
                  Anuluj
                </button>

                <button
                  style={styles.primary}
                  onClick={
                    saveReservation
                  }
                >
                  Zapisz rezerwację
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SZCZEGÓŁY */}

      {detailsOpen && (
        <div
          onClick={() =>
            setDetailsOpen(null)
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(10,20,15,.58)",
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
              borderRadius:
                "26px 26px 0 0",
              padding:
                "23px 18px 28px",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#6c756f",
                textTransform:
                  "uppercase",
                fontWeight: 800,
              }}
            >
              Rezerwacja
            </div>

            <h2>
              {detailsOpen.patrol}
            </h2>

            <p>
              <strong>
                {detailsOpen.time}–
                {addMinutes(
                  detailsOpen.time,
                  30
                )}
              </strong>

              <br />

              📍 {detailsOpen.location}

              <br />

              {detailsOpen.leader} •
              zastępowy / lider
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 9,
              }}
            >
              <button
                style={styles.secondary}
                onClick={() =>
                  setDetailsOpen(null)
                }
              >
                Zamknij
              </button>

              <button
                style={styles.primary}
                onClick={() =>
                  removeReservation(
                    detailsOpen.id
                  )
                }
              >
                Anuluj rezerwację
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
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
      <span
        style={{
          width: 7,
          height: 7,
          background: color,
          borderRadius: "50%",
        }}
      />

      {label}
    </span>
  );
}

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
