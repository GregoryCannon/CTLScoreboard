import { Table, TableCell, TableRow } from "../node_modules/@mui/material/index";

const rows = [
  {
    id: 1,
    player1: "arbaro",
    player2: "tobs",
    time: Date.parse("2024-02-26T06:30Z")
  },
  {
    id: 2,
    player1: "snowytetris",
    player2: "lapis lazuli",
    time: Date.parse("2024-01-30T06:00Z"),
    restreamer: "cchristm"
  }
]

export default function UpcomingMatches() {
  return (
    <Table size ="small">
      {rows.map((row) => (
        <TableRow key={row.id}>
          <TableCell>{row.player1}</TableCell>
          <TableCell>vs</TableCell>
          <TableCell>{row.player2}</TableCell>
          <TableCell>{row.time.toString}</TableCell>
          <TableCell>
            {
              row.restreamer ? `Restreamer: ${row.restreamer}` : "Restreamer needed"
            }
          </TableCell>
        </TableRow>
  
      ))}

    </Table>

  );
}