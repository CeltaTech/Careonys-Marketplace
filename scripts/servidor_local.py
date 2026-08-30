# -*- coding: utf-8 -*-
"""El servidor para mirar las pantallas mientras se trabaja.

Es `python -m http.server` con tres diferencias, y cada una es el motivo de que
exista.

**No deja guardar copias.** Sin eso el navegador se queda con la copia vieja de
`js/main.js` y sigue mostrándola después de haber cambiado el archivo, sin
avisar. Recargar no alcanza, y vaciar la memoria del navegador tampoco siempre:
es una hora perdida buscando un error que ya estaba arreglado. Con `no-store`
cada recarga va a buscar el archivo de nuevo.

**No publica las cajas fuertes.** Hasta el 30 de agosto de 2026 publicaba la
carpeta del proyecto entera, y adentro de esa carpeta hay una caja fuerte: quien
tuviera abierto el navegador contra este servidor podía pedirla por su nombre y
leerla. La regla dice que no se abren ni para verificar algo, y un servidor que
las entrega por la red las abre para cualquiera. Se cierran por camino: cae
afuera todo lo que empiece por una de ellas, y también `.git`, que guarda el
historial entero.

**Y sabe apuntar a la base de esta máquina**, con `--base-local`. Hay
comprobaciones que sólo valen mirando la pantalla —que el aislamiento se
sostenga donde lo ve una persona y no sólo donde lo ve una consulta—, y esas
piden sesión con rol de coordinador. Esas cuentas viven en la base de esta
máquina (`scripts/preparar_coordinadores_locales.mjs`), porque en el servidor de
verdad crear una pide confirmar un correo y ascenderla pide una clave que acá no
se abre. El cambio se hace **sobre el texto que sale por la red y nunca sobre el
archivo**: la alternativa era cambiar la dirección a mano y acordarse de volverla
atrás, y el día que alguien se olvida el repositorio queda apuntando a
`localhost` y la publicación sale rota.

No se cambia un renglón sino **la dirección misma, en todo `.js` que salga**, y
la dirección a reemplazar se lee del propio proyecto. El motivo se descubrió
acá: la dirección del servidor está escrita **dos veces** —`js/apiClient.js` y
`js/auth.js`—, así que cambiar una sola dejaba las pantallas leyendo de la base
de esta máquina y pidiendo la sesión al servidor de verdad, donde esas cuentas
no existen; se veía como «el correo o la contraseña no coinciden». Que esté
escrita dos veces es un defecto del proyecto y está anotado aparte; esto no lo
tapa, se acomoda a él.

Publica siempre la carpeta del proyecto, la de este mismo archivo un nivel más
arriba, y no aquella desde la que lo hayan llamado. El motivo es el mismo: el
programa que lo arranca no siempre está parado donde uno cree, y un servidor que
publica la carpeta equivocada se ve igual que uno que anda —contesta— pero
devuelve otra cosa.

Se arranca solo, desde `.claude/launch.json`. A mano:

    python scripts/servidor_local.py 5599
    python scripts/servidor_local.py 5599 --base-local
"""
import functools
import io
import os
import re
import subprocess
import sys
from urllib.parse import unquote
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Se comparan en minúsculas contra el primer tramo del camino pedido. Están las
# cinco formas de nombrar una caja fuerte que usa la empresa, más el historial.
CERRADAS = {
    "no commit",
    "no_commit",
    "no hacer commit",
    "no pushear",
    "referencianohacercommit",
    ".git",
}


def base_de_esta_maquina():
    """Devuelve (dirección, clave publicable) del entorno local, o se planta.

    Se leen de `supabase status -o env` y no se escriben acá: si cambian, esto
    sigue andando. Ninguna se imprime.
    """
    try:
        salida = subprocess.run(
            ["supabase", "status", "-o", "env"],
            cwd=RAIZ, capture_output=True, text=True, shell=True, check=True,
        ).stdout
    except Exception:
        print("El entorno de esta máquina no está levantado. Antes:")
        print("    supabase start -x edge-runtime -x vector -x supavisor -x logflare")
        sys.exit(1)

    url = re.search(r'^API_URL="?([^"\s]+)', salida, re.M)
    anon = re.search(r'^ANON_KEY="?([^"\s]+)', salida, re.M)
    if not url or not anon:
        print("No se pudo averiguar la dirección de la base de esta máquina.")
        sys.exit(1)
    return url.group(1).rstrip("/"), anon.group(1)


class SinGuardarNada(SimpleHTTPRequestHandler):
    """El mismo servidor de siempre, con las tres diferencias de arriba."""

    base_local = None  # (dirección, clave) cuando se pidió --base-local
    remota = None      # (dirección, clave) que el proyecto trae escritas

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        SimpleHTTPRequestHandler.end_headers(self)

    def _es_caja_fuerte(self):
        camino = self.path.split("?")[0].split("#")[0]
        tramos = [t.lower() for t in unquote(camino).replace("\\", "/").split("/") if t]
        return any(t in CERRADAS for t in tramos)

    def send_head(self):
        if self._es_caja_fuerte():
            self.send_error(403, "No.")
            return None

        # El único cambio al contenido, y sólo cuando se pidió: la dirección de
        # la base. Se avisa cuando un archivo que la nombra no cambió, porque
        # servir en silencio una copia que sigue apuntando al servidor de
        # verdad es exactamente el error que esto viene a evitar.
        camino_pedido = self.path.split("?")[0]
        if self.base_local and camino_pedido.lower().endswith(".js"):
            archivo_real = self.translate_path(self.path)
            try:
                with open(archivo_real, "r", encoding="utf-8") as archivo:
                    texto = archivo.read()
            except OSError:
                return SimpleHTTPRequestHandler.send_head(self)

            url_remota, clave_remota = self.remota
            url_local, clave_local = self.base_local
            cambiado = texto.replace(url_remota, url_local).replace(clave_remota, clave_local)

            if cambiado == texto:
                if url_remota in texto or clave_remota in texto:
                    print("AVISO  %s nombra la base y no se pudo cambiar." % camino_pedido)
                return SimpleHTTPRequestHandler.send_head(self)

            crudo = cambiado.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(crudo)))
            self.end_headers()
            return io.BytesIO(crudo)

        return SimpleHTTPRequestHandler.send_head(self)


def base_que_trae_el_proyecto():
    """Devuelve (dirección, clave publicable) tal como las trae el repositorio.

    Se leen de `js/apiClient.js` y no se escriben acá: escribir una clave
    adentro de un guion del repositorio es una clave en el repositorio, y
    además quedaría vieja el día que cambie. Ninguna se imprime.
    """
    with io.open(os.path.join(RAIZ, "js", "apiClient.js"), encoding="utf-8") as archivo:
        fuente = archivo.read()
    url = re.search(r"supabaseUrl:\s*'([^']+)'", fuente)
    clave = re.search(r"supabaseKey:\s*'([^']+)'", fuente)
    if not url or not clave:
        print("js/apiClient.js no declara la dirección de la base donde se esperaba.")
        sys.exit(1)
    return url.group(1).rstrip("/"), clave.group(1)


class ServidorConCola(ThreadingHTTPServer):
    """El mismo servidor, con la cola de conexiones que hace falta.

    `ThreadingHTTPServer` acepta cinco conexiones esperando y el sistema
    corta las que sobran. Una pantalla de este proyecto pide tres hojas de
    estilo, cinco archivos de programa y el catálogo, todos a la vez, y el
    navegador abre una conexión por cada uno: la sexta se cortaba. Se veía
    como `js/auth.js` que no llegaba —y con él `Sesion`— una recarga sí y
    otra no, que es de los errores más caros de encontrar porque volver a
    cargar «lo arregla».
    """

    request_queue_size = 128
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    argumentos = [a for a in sys.argv[1:] if not a.startswith("--")]
    puerto = int(argumentos[0]) if argumentos else 5599

    if "--base-local" in sys.argv:
        SinGuardarNada.remota = base_que_trae_el_proyecto()
        SinGuardarNada.base_local = base_de_esta_maquina()

    print("Las pantallas se ven en http://localhost:%d" % puerto)
    print("Se publica %s" % RAIZ)
    if SinGuardarNada.base_local:
        print("Apuntando a la base de esta máquina. El repositorio no se tocó.")
    manejador = functools.partial(SinGuardarNada, directory=RAIZ)
    ServidorConCola(("", puerto), manejador).serve_forever()
