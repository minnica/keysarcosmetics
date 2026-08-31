import { describe, expect, it } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './data-table'
import { renderWithUser, screen, within } from '../../test/render'

interface Person {
  id: number
  name: string
  branch: string
}

const columns: ColumnDef<Person>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'branch', header: 'Sucursal' },
]

const people: Person[] = [
  { id: 1, name: 'Ana', branch: 'Centro' },
  { id: 2, name: 'Beatriz', branch: 'Norte' },
  { id: 3, name: 'Carla', branch: 'Sur' },
  { id: 4, name: 'Daniela', branch: 'Centro' },
  { id: 5, name: 'Elena', branch: 'Norte' },
  { id: 6, name: 'Fernanda', branch: 'Sur' },
  { id: 7, name: 'Gabriela', branch: 'Centro' },
  { id: 8, name: 'Helena', branch: 'Norte' },
  { id: 9, name: 'Irene', branch: 'Sur' },
  { id: 10, name: 'Julia', branch: 'Centro' },
  { id: 11, name: 'Karla', branch: 'Norte' },
  { id: 12, name: 'Laura', branch: 'Sur' },
]

function visibleNames() {
  const body = screen.getAllByRole('rowgroup')[1]
  if (!body) throw new Error('No se encontro el cuerpo de la tabla')
  return within(body)
    .getAllByRole('row')
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent)
}

describe('DataTable', () => {
  it('muestra encabezados, filas, etiquetas y estado vacio', () => {
    const { rerender } = renderWithUser(
      <DataTable
        columns={columns}
        data={people.slice(0, 2)}
        labels={{ records: 'Filas' }}
      />,
    )

    expect(
      screen.getByRole('columnheader', { name: /nombre/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /sucursal/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('2 RESULTADOS')).toBeInTheDocument()
    expect(screen.getByText('FILAS')).toBeInTheDocument()

    rerender(
      <DataTable columns={columns} data={[]} emptyMessage="No hay personas" />,
    )
    expect(screen.getByText('NO HAY PERSONAS')).toBeInTheDocument()
    expect(screen.getByText('0 RESULTADOS')).toBeInTheDocument()
  })

  it('ordena en ambos sentidos usando la definicion publica de columnas', async () => {
    const { user } = renderWithUser(
      <DataTable
        columns={columns}
        data={[people[2]!, people[0]!, people[1]!]}
      />,
    )
    const sortByName = screen.getByRole('button', { name: /nombre/i })

    await user.click(sortByName)
    expect(visibleNames()).toEqual(['Ana', 'Beatriz', 'Carla'])

    await user.click(sortByName)
    expect(visibleNames()).toEqual(['Carla', 'Beatriz', 'Ana'])
  })

  it('filtra globalmente y actualiza el total visible', async () => {
    const { user } = renderWithUser(
      <DataTable columns={columns} data={people} />,
    )

    await user.type(screen.getByPlaceholderText('BUSCAR...'), 'norte')

    expect(screen.getByText('4 RESULTADOS')).toBeInTheDocument()
    expect(screen.getByText('Beatriz')).toBeInTheDocument()
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
  })

  it('pagina, cambia el tamano de pagina y permite mostrar todos los registros', async () => {
    const { user } = renderWithUser(
      <DataTable columns={columns} data={people} pageSize={10} />,
    )

    const previous = screen.getByRole('button', { name: 'Página anterior' })
    const next = screen.getByRole('button', { name: 'Página siguiente' })
    expect(previous).toBeDisabled()
    expect(next).toBeEnabled()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    await user.click(next)
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByText('Laura')).toBeInTheDocument()
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'TODOS' }))

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Laura')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Página siguiente' }),
    ).not.toBeInTheDocument()
  })
})
