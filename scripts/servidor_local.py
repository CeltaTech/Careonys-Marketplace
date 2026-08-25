# -*- coding: utf-8 -*-
"""El servidor para mirar las pantallas mientras se trabaja.

Es `python -m http.server` con una sola diferencia, y la diferencia es el
motivo de que exista: le dice al navegador que no guarde nada.

Sin eso el navegador se queda con la copia vieja de `js/main.js` y sigue
mostrándola después de haber cambiado el archivo, sin avisar. Recargar no
alcanza, y vaciar la memoria del navegador tampoco siempre: es una hora
perdida buscando un error que ya estaba arreglado. Con `no-store` cada recarga
va a buscar el archivo de nuevo.

Publica siempre la carpeta del proyecto, la de este mismo archivo un nivel
más arriba, y no aquella desde la que lo hayan llamado. El motivo es el mismo
de antes: el programa que lo arranca no siempre está parado donde uno cree, y
un servidor que publica la carpeta equivocada se ve igual que uno que anda
—contesta— pero devuelve otra cosa.

Se arranca solo, desde `.claude/launch.json`. A mano:

    python scripts/servidor_local.py 5599
"""
import functools
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class SinGuardarNada(SimpleHTTPRequestHandler):
    """El mismo servidor de siempre, pidiendo que no se guarde ninguna copia."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        SimpleHTTPRequestHandler.end_headers(self)


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 5599
    print("Las pantallas se ven en http://localhost:%d" % puerto)
    print("Se publica %s" % RAIZ)
    manejador = functools.partial(SinGuardarNada, directory=RAIZ)
    ThreadingHTTPServer(("", puerto), manejador).serve_forever()
