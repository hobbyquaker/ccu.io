/*  Pattern Attribute

    logic       string          "and" oder "or" Logik zum Verknüpfen der Bedingungen nutzen (default: "and")

    id          integer         ID ist gleich

    name        string          name ist gleich
                RegExp          name matched Regulären Ausdruck

    change      string          "eq", "neq", "gt", "ge", "lt", "le" (default: undefined)
                                    "eq"    Wert muss gleich geblieben sein (val == oldval)
                                    "neq"   Wert muss sich geändert haben (val != oldval)
                                    "gt"    Wert muss großer geworden sein (val > oldval)
                                    "ge"    Wert muss größer geworden oder gleich geblieben sein (val >= oldval)
                                    "lt"    Wert muss kleiner geworden sein (val < oldval)
                                    "le"    Wert muss kleiner geworden oder gleich geblieben sein (val <= oldval)

    val         mixed           Wert ist gleich
    valGt       mixed           Wert ist größer
    valGe       mixed           Wert ist größer oder gleich
    valLt       mixed           Wert ist kleiner
    valLe       mixed           Wert ist kleiner oder gleich

    ack         bool            Wert ist bestätigt (default: false)

    oldVal      mixed           vorheriger Wert ist gleich
    oldValGt    mixed           vorheriger Wert ist größer
    oldValGe    mixed           vorheriger Wert ist größer oder gleich
    oldValLt    mixed           vorheriger Wert ist kleiner
    oldValLe    mixed           vorheriger Wert ist kleiner oder gleich

    oldAck      bool            vorheriger Wert ist bestätigt (default: false)

    ts          string          Timestamp ist gleich
    tsGt        string          Timestamp ist größer
    tsGe        string          Timestamp ist größer oder gleich
    tsLt        string          Timestamp ist kleiner
    tsLe        string          Timestamp ist kleiner oder gleich

    oldTs       string          vorheriger Timestamp ist gleich
    oldTsGt     string          vorheriger Timestamp ist größer
    oldTsGe     string          vorheriger Timestamp ist größer oder gleich
    oldTsLt     string          vorheriger Timestamp ist kleiner
    oldTsLe     string          vorheriger Timestamp ist kleiner oder gleich

    lc          string          Lastchange ist gleich
    lcGt        string          Lastchange ist größer
    lcGe        string          Lastchange ist größer oder gleich
    lcLt        string          Lastchange ist kleiner
    lcLe        string          Lastchange ist kleiner oder gleich
    
    oldLc       string          vorheriger Lastchange ist gleich
    oldLcGt     string          vorheriger Lastchange ist größer
    oldLcGe     string          vorheriger Lastchange ist größer oder gleich
    oldLcLt     string          vorheriger Lastchange ist kleiner
    oldLcLe     string          vorheriger Lastchange ist kleiner oder gleich

    room        integer         Raum ID ist gleich
                string          Raum ist gleich
                RegExp          Raum matched Regulären Ausdruck

    func        integer         Gewerk ID ist gleich
                string          Gewerk ist gleich
                RegExp          Gewerk matched Regulären Ausdruck

    channel     integer         Kanal ID ist gleich
                string          Kanal-Name ist gleich
                RegExp          Kanal-Name matched Regulären Ausdruck

    device      integer         Geräte ID ist gleich
                string          Geräte-Name ist gleich
                RegExp          Geräte-Name matched Regulären Ausdruck

    channelType string          Kanal HssType ist gleich
                RegExp          Kanal HssType matched Regulären Ausdruck

    deviceType  string          Geräte HssType ist gleich
                RegExp          Geräte HssType matched Regulären Ausdruck



    */
