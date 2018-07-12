## Overview about software components and interactions ##

To conduct a race event, two software components have to be installed and
communicate with each other:
- the Race Management software (pwd-racemanager) and
- the Racetrack Bridge (pwd-racetrack/bridge).

Optionally another component (pwd-racedisplay) can be used to display information
about the race progress to a larger audience.

The Race Management software is an Electron-based component which implements the
basic functions, like registering all race cars, setting up a race and the heats
and conducting the actual race. The Race Management software will drive one or
more displays for the audience.  

The Racetrack Bridge software is a node.js based component which acts as a
bridge between the serial information from the racetrack firmware and a TCP/IP
network. The bridge implements a persistent storage for the race setup and the
messages exchanged with the racetrack firmware. The component basically
implements a small REST webserver based on websocket technology and exposes the
persistent storage and simple commands to the Race Management software.  

The Racedisplay software is a small website/application that retrieves information
from the REST interface of the bridge and formats it for a projector or large 
display.
