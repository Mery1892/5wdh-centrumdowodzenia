"use client";

import { useState } from "react";

const PATROLS = [
  { name: "H Falco", leader: "Filip" },
  { name: "H Świetliki", leader: "Lilianna" },
  { name: "HS Męski", leader: "Karol" },
  { name: "HS Damski", leader: "Basia" },
  { name: "Wędrownicy", leader: "Tymon" },
];

const LOCATIONS = ["Nora", "Basecamp"];

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
];

function createTimes() {
  const result = [];

  for (let hour = 7; hour <= 21; hour++) {
    result.push(`${String(hour).padStart(2, "0")}:00`);
    result.push(`${String(hour).padStart(2, "0")}:30`);
  }

  result.push("22:00");

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

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("Grafik");
  const [selectedDate, setSelectedDate] = useState("2026-09-26");
  const [locationFilter, setLocationFilter] = useState("Wszystkie");
  const [reservations, setReservations] = useState(STARTING_RESERVATIONS);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(null);

  const [form, setForm] = useState({
    patrol: "H Falco",
    location: "Nora",
    time: "17:30",
  });

  function openReservation(time = "17:30", location = "Nora") {
    setForm({
      patrol: "H Falco",
      location,
      time,
    });

    setModalOpen(true);
  }

  function saveReservation() {
    const patrol = PATROLS.find((item) => item.name === form.patrol);

    const occupied = reservations.some(
      (item) =>
        item.date === selectedDate &&
        item.time === form.time &&
        item.location === form.location
    );

    if (occupied) {
      alert("Ten termin w tym miejscu jest już zajęty.");
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
        location: form.location,
      },
    ]);

    setModalOpen(false);
  }

  function removeReservation(id) {
    setReservations(reservations.filter((item) => item.id !== id));
    setDetailsOpen(null);
  }

  const dayReservations = reservations
    .filter((item) => item.date === selectedDate)
    .filter(
      (item) =>
        locationFilter === "Wszystkie" ||
        item.location === locationFilter
    )
    .sort((a, b) => a.time.localeCompare(b.time));

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
                onClick={() =>
                  setSelectedDate(moveDate(selectedDate, -1))
                }
              >
                ←
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
                style={{
                  border: 0,
                  fontWeight: 700,
                  fontSize: 15,
                  background: "transparent",
                  color: "#17231c",
                }}
              />

              <button
                style={styles.secondary}
                onClick={() =>
                  setSelectedDate(moveDate(selectedDate, 1))
                }
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
              {["Wszystkie", ...LOCATIONS].map((location) => (
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
              ))}
            </div>

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
              {dayReservations.map((reservation) => (
                <button
                  key={reservation.id}
                  onClick={() => setDetailsOpen(reservation)}
                  style={{
                    ...styles.card,
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
                      {reservation.leader} • zastępowy / lider
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
                const hour = Number(time.slice(0, 2));
                const date = new Date(`${selectedDate}T12:00:00`);
                const weekend =
                  date.getDay() === 0 || date.getDay() === 6;

                if (!weekend && (hour < 12 || hour >= 22)) {
                  return false;
                }

                if (weekend && (hour < 7 || hour >= 22)) {
                  return false;
                }

                return time !== "22:00";
              })
                .slice(0, 12)
                .map((time) => {
                  const locationsToShow =
                    locationFilter === "Wszystkie"
                      ? LOCATIONS
                      : [locationFilter];

                  return locationsToShow.map((location) => {
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
                          style={styles.secondary}
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
            </div>
          </>
        )}

        {activeTab === "Moje" && (
          <>
            <h2>Moje</h2>

            <p style={{ color: "#66736c" }}>
              Twoje najbliższe rezerwacje i sprawy.
            </p>

            <div style={styles.card}>
              <strong>Najbliższe działania</strong>
              <p style={{ color: "#69746d" }}>
                Tutaj podepniemy rezerwacje użytkownika,
                zadania i wyjazdy.
              </p>
            </div>
          </>
        )}

        {activeTab === "Wyjazdy" && (
          <>
            <h2>Wyjazdy</h2>

            <p style={{ color: "#66736c" }}>
              Biwaki, rajdy, zawody i wyprawy.
            </p>

            <div style={styles.card}>
              <strong>+ Nowy wyjazd</strong>

              <p style={{ color: "#69746d" }}>
                Tu pojawią się terminy, uczestnicy, transport,
                koszty, wpłaty i zgody.
              </p>
            </div>
          </>
        )}

        {activeTab === "Zadania" && (
          <>
            <h2>Zadania</h2>

            <p style={{ color: "#66736c" }}>
              Kto, co i do kiedy.
            </p>

            <div style={styles.card}>
              <strong>Brak aktywnych zadań</strong>

              <p style={{ color: "#69746d" }}>
                W kolejnym etapie podepniemy zadania kadry z
                bazy.
              </p>
            </div>
          </>
        )}

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
                      `${item} — ten moduł podepniemy w następnym etapie.`
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
          boxShadow: "0 -5px 18px rgba(0,0,0,.04)",
        }}
      >
        {["Grafik", "Moje", "Wyjazdy", "Zadania", "Więcej"].map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                border: 0,
                background: "transparent",
                color:
                  activeTab === tab ? "#8b2635" : "#68736d",
                fontWeight: activeTab === tab ? 800 : 500,
                cursor: "pointer",
                padding: "6px 8px",
              }}
            >
              {tab}
            </button>
          )
        )}
      </nav>

      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
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
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "#f7f6f1",
              width: "100%",
              maxWidth: 600,
              borderRadius: "26px 26px 0 0",
              padding: "23px 18px 28px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              Nowa rezerwacja
            </h2>

            <div
              style={{
                display: "grid",
                gap: 15,
              }}
            >
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
                    })
                  }
                  style={inputStyle}
                >
                  {LOCATIONS.map((location) => (
                    <option key={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>

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
                  {TIMES.slice(0, -1).map((time) => (
                    <option key={time}>{time}</option>
                  ))}
                </select>
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 9,
                  marginTop: 5,
                }}
              >
                <button
                  style={styles.secondary}
                  onClick={() => setModalOpen(false)}
                >
                  Anuluj
                </button>

                <button
                  style={styles.primary}
                  onClick={saveReservation}
                >
                  Zapisz rezerwację
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailsOpen && (
        <div
          onClick={() => setDetailsOpen(null)}
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
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "#f7f6f1",
              width: "100%",
              maxWidth: 600,
              borderRadius: "26px 26px 0 0",
              padding: "23px 18px 28px",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#6c756f",
                textTransform: "uppercase",
                fontWeight: 800,
              }}
            >
              Rezerwacja
            </div>

            <h2>{detailsOpen.patrol}</h2>

            <p>
              <strong>
                {detailsOpen.time}–
                {addMinutes(detailsOpen.time, 30)}
              </strong>
              <br />
              {detailsOpen.location}
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
                style={styles.secondary}
                onClick={() => setDetailsOpen(null)}
              >
                Zamknij
              </button>

              <button
                style={{
                  ...styles.primary,
                  background: "#8b2635",
                }}
                onClick={() =>
                  removeReservation(detailsOpen.id)
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
