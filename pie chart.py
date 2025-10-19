#filtro oc_data_inizio_progetto 2014-1024
#filtra prev_studio_fatt sameyear, early, delayed
import pandas as pd
all_project = pd.read_csv("../open_coesione.csv")
date_columns = ['DATA_INIZIO_PREV_STUDIO_FATT','OC_DATA_INIZIO_PROGETTO','OC_DATA_FINE_PROGETTO_EFFETTIVA']
all_project['DATA_INIZIO_PREV_STUDIO_FATT'] = pd.to_datetime(all_project['DATA_INIZIO_PREV_STUDIO_FATT'])
all_project['OC_DATA_INIZIO_PROGETTO'] = pd.to_datetime(all_project['OC_DATA_INIZIO_PROGETTO'])
all_project['OC_DATA_FINE_PROGETTO_EFFETTIVA'] = pd.to_datetime(all_project['OC_DATA_FINE_PROGETTO_EFFETTIVA'])
time_section = all_project.loc[(all_project["OC_DATA_INIZIO_PROGETTO"].dt.year >= 2014) & (all_project["OC_DATA_INIZIO_PROGETTO"].dt.year <= 2024)]
time_section




# Helper: normalize region names 
def normalize_region_name(name: str) -> str:
    if not isinstance(name, str):
        return ""
    normalized = "".join(ch for ch in name.lower() if ch.isalnum())
    if "trentino" in normalized or "bolzano" in normalized or "altoadige" in normalized:
        return "trentinoaltoadige"
    elif "friuli" in normalized:
        return "friuliveneziagiulia"
    elif "valledaosta" in normalized or "aoste" in normalized:
        return "valledaosta"
    elif "emiliaromagna" in normalized:
        return "emiliaromagna"
    elif "lombardia" in normalized:
        return "lombardia"
    elif "piemonte" in normalized:
        return "piemonte"
    elif "veneto" in normalized:
        return "veneto"
    elif "liguria" in normalized:
        return "liguria"
    elif "toscana" in normalized:
        return "toscana"
    elif "umbria" in normalized:
        return "umbria"
    elif "marche" in normalized:
        return "marche"
    elif "lazio" in normalized:
        return "lazio"
    elif "abruzzo" in normalized:
        return "abruzzo"
    elif "molise" in normalized:
        return "molise"
    elif "campania" in normalized:
        return "campania"
    elif "puglia" in normalized:
        return "puglia"
    elif "basilicata" in normalized:
        return "basilicata"
    elif "calabria" in normalized:
        return "calabria"
    elif "sicilia" in normalized:
        return "sicilia"
    elif "sardegna" in normalized:
        return "sardegna"
    return normalized

#  Apply normalization 
time_section["REGION_KEY"] = time_section["DEN_REGIONE"].apply(normalize_region_name)

# Map normalized keys back to Italian names 
region_name_map = {
    "piemonte": "Piemonte",
    "valledaosta": "Valle d’Aosta",
    "lombardia": "Lombardia",
    "trentinoaltoadige": "Trentino-Alto Adige",
    "veneto": "Veneto",
    "friuliveneziagiulia": "Friuli-Venezia Giulia",
    "liguria": "Liguria",
    "emiliaromagna": "Emilia-Romagna",
    "toscana": "Toscana",
    "umbria": "Umbria",
    "marche": "Marche",
    "lazio": "Lazio",
    "abruzzo": "Abruzzo",
    "molise": "Molise",
    "campania": "Campania",
    "puglia": "Puglia",
    "basilicata": "Basilicata",
    "calabria": "Calabria",
    "sicilia": "Sicilia",
    "sardegna": "Sardegna"
}
time_section["DEN_REGIONE_CLEAN"] = time_section["REGION_KEY"].map(region_name_map)
time_section




on_time = time_section.loc[(time_section["OC_DATA_INIZIO_PROGETTO"].dt.year == time_section["DATA_INIZIO_PREV_STUDIO_FATT"].dt.year)]
# on_time 1284 progetti
delayed = time_section.loc[(time_section["OC_DATA_INIZIO_PROGETTO"].dt.year > time_section["DATA_INIZIO_PREV_STUDIO_FATT"].dt.year)]
# delayed 908 progetti
early = time_section.loc[(time_section["OC_DATA_INIZIO_PROGETTO"].dt.year < time_section["DATA_INIZIO_PREV_STUDIO_FATT"].dt.year)]
# early 580 progetti




from matplotlib import pyplot as plt

pie_data = [len(on_time), len(delayed), len(early)]
pie_labels = ["On Time", "Delayed", "Early"]
total = sum(pie_data)

fig, ax = plt.subplots(figsize=(8, 6))
wedges, texts, autotexts = ax.pie(pie_data,
                               labels=pie_labels,
                               autopct='%1.0f%%',
                                wedgeprops=dict(width=0.7, edgecolor='w'),
                                colors = ["#2A63AD", "#322AAD", "#2AA5AD"]
                                 )
ax.legend(wedges,            
    pie_labels,        
    title="Project start",
    loc="center left",
    bbox_to_anchor=(1, 0.3, 0.5, 1)
)
ax.text(0, 0, f"Total: {total}", ha='center', va='center', fontsize=10)
ax.set_title("Projects start timeliness")
plt.show()