export default function Home() {
  const rezerwacje = [
    {
      godzina: "17:30–18:00",
      zastep: "H Falco",
      lider: "Filip",
      miejsce: "Nora",
    },
    {
      godzina: "18:00–18:30",
      zastep: "H Świetliki",
      lider: "Lilianna",
      miejsce: "Basecamp",
    },
    {
      godzina: "19:00–19:30",
      zastep: "Wędrownicy",
      lider: "Tymon",
      miejsce: "Nora",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f1e9",
        color: "#17231c",
        fontFamily: "Arial, sans-serif",
        paddingBottom: "90px",
      }}
    >
      {/* GÓRA */}
      <header
        style={{
          background: "#18392b",
          color: "white",
          padding: "28px 22px 34px",
          borderRadius: "0 0 28px 28px",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              letterSpacing: "2px",
              opacity: 0.75,
              marginBottom: "8px",
            }}
          >
            5 WDH • CZERWONE BERETY
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              lineHeight: 1.1,
            }}
          >
            Centrum Dowodzenia
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              opacity: 0.8,
              fontSize: "15px",
            }}
          >
            Grafik drużyny, rezerwacje i najważniejsze sprawy.
          </p>
        </div>
      </header>

      {/* ZAWARTOŚĆ */}
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "24px 16px",
        }}
      >
        {/* DATA */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "22px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "#68736d",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              Grafik
            </div>

            <h2
              style={{
                margin: "4px 0 0",
                fontSize: "23px",
              }}
            >
              Sobota, 26 września
            </h2>
          </div>

          <button
            style={{
              border: "none",
              background: "#8d2635",
              color: "white",
              borderRadius: "14px",
              padding: "12px 16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            + Rezerwacja
          </button>
        </div>

        {/* MIEJSCA */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "18px",
          }}
        >
          <button
            style={{
              border: "none",
              background: "#18392b",
              color: "white",
              borderRadius: "20px",
              padding: "9px 16px",
              fontWeight: "bold",
            }}
          >
            Wszystkie
          </button>

          <button
            style={{
              border: "1px solid #d2d5cf",
              background: "white",
              color: "#26362e",
              borderRadius: "20px",
              padding: "9px 16px",
            }}
          >
            Nora
          </button>

          <button
            style={{
              border: "1px solid #d2d5cf",
              background: "white",
              color: "#26362e",
              borderRadius: "20px",
              padding: "9px 16px",
            }}
          >
            Basecamp
          </button>
        </div>

        {/* REZERWACJE */}
        <div
          style={{
            display: "grid",
            gap: "10px",
          }}
        >
          {rezerwacje.map((rezerwacja) => (
            <div
              key={
                rezerwacja.godzina +
                rezerwacja.zastep +
                rezerwacja.miejsce
              }
              style={{
                background: "white",
                borderRadius: "18px",
                padding: "17px",
                display: "grid",
                gridTemplateColumns: "105px 1fr auto",
                alignItems: "center",
                gap: "14px",
                boxShadow: "0 3px 14px rgba(0,0,0,0.05)",
                borderLeft: "5px solid #8d2635",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                {rezerwacja.godzina}
              </div>

              <div>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: "17px",
                  }}
                >
                  {rezerwacja.zastep}
                </div>

                <div
                  style={{
                    color: "#69736e",
                    marginTop: "3px",
                    fontSize: "14px",
                  }}
                >
                  {rezerwacja.lider} • zastępowy / lider
                </div>
              </div>

              <div
                style={{
                  background: "#edf1ed",
                  borderRadius: "12px",
                  padding: "8px 11px",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                {rezerwacja.miejsce}
              </div>
            </div>
          ))}

          {/* WOLNY TERMIN */}
          <div
            style={{
              border: "2px dashed #c8cec9",
              borderRadius: "18px",
              padding: "17px",
              display: "grid",
              gridTemplateColumns: "105px 1fr auto",
              alignItems: "center",
              gap: "14px",
              color: "#667169",
            }}
          >
            <strong>18:30–19:00</strong>

            <span>Wolny termin</span>

            <button
              style={{
                border: "none",
                background: "#dfe7df",
                color: "#18392b",
                borderRadius: "11px",
                padding: "8px 12px",
                fontWeight: "bold",
              }}
            >
              Zarezerwuj
            </button>
          </div>
        </div>
      </section>

      {/* DOLNE MENU */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#ffffff",
          borderTop: "1px solid #dfe2de",
          display: "flex",
          justifyContent: "space-around",
          padding: "12px 4px 14px",
          zIndex: 100,
        }}
      >
        {["Grafik", "Moje", "Wyjazdy", "Zadania", "Więcej"].map(
          (element, index) => (
            <div
              key={element}
              style={{
                fontSize: "12px",
                fontWeight: index === 0 ? "bold" : "normal",
                color: index === 0 ? "#8d2635" : "#69736e",
              }}
            >
              {element}
            </div>
          )
        )}
      </nav>
    </main>
  );
}
