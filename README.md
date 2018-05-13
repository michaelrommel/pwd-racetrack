# pwd-racetrack
A Pinewood Derby racetrack timer and start gate electronics firmware.

This software implements the firmware for a Pinewood Derby race track
electronics. The race track receives commands, like the setup or start commands
and sends back results, like the finishing times for each lane after a heat ends.

The subdirectory platformio contains a PlatformIO project (https://platformio.org/).
You should install the PlatformIO IDE based on the Atom Editor to work with this
repo.

The racetrack electronics consists of three main parts:
- the main controller based on an Arduino Due with a protoype extension board.
  The extension board implements the connections to the finish gate display
  modules and to the start gate.
- the display modules (one per lane) implement the main display of the achieved
  place in the heat and the display of the time in milliseconds. Also the LDR
  (Light Dependent Resistor) needed to detect the interruption of the laser
  beam is implemented on this module.
- the start gate electronics. This part is a separate Arduino Pro Mini
  controlling four RFID readers to detect the cars on each track and the
  solenoid for opening the start gate.

If you commit to this repo, please use descriptive commit messages. A good guide
can be found at: https://chris.beams.io/posts/git-commit/

In short, a properly formed Git commit subject line should always be able to 7
complete the following sentence:

- If applied, this commit will <_your subject line here_>

(c) 2018 by Michael Rommel
