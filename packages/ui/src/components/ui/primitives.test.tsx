import { describe, expect, it } from 'vitest'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Progress,
  ProgressKeysar,
  Separator,
  Skeleton,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  buttonVariants,
  cn,
} from '../..'
import { render, screen } from '../../test/render'

describe('primitivos públicos', () => {
  it('preserva semántica, variantes y asociación de los controles de formulario', () => {
    render(
      <>
        <Button variant="destructive">Eliminar</Button>
        <Button asChild><a href="/perfil">Perfil</a></Button>
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" defaultValue="Keysar" />
        <Textarea aria-label="Notas" defaultValue="Seguimiento" />
        <Badge variant="outline">Activo</Badge>
      </>,
    )

    expect(screen.getByRole('button', { name: 'Eliminar' })).toHaveClass('bg-destructive')
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/perfil')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Keysar')
    expect(screen.getByLabelText('Notas')).toHaveValue('Seguimiento')
    expect(screen.getByText('Activo')).toHaveClass('text-foreground')
    expect(buttonVariants({ size: 'icon' })).toContain('w-9')
    expect(cn('p-2', 'p-4', false && 'hidden')).toBe('p-4')
  })

  it('compone superficies, indicadores y tabla con sus elementos semánticos', () => {
    render(
      <>
        <Card>
          <CardHeader><CardTitle>Resumen</CardTitle><CardDescription>Periodo actual</CardDescription></CardHeader>
          <CardContent>Contenido</CardContent>
          <CardFooter>Pie</CardFooter>
        </Card>
        <Skeleton data-testid="skeleton" />
        <Progress value={40} aria-label="Progreso base" />
        <ProgressKeysar value={85} />
        <Separator decorative={false} orientation="vertical" />
        <Table>
          <TableCaption>Ventas</TableCaption>
          <TableHeader><TableRow><TableHead>Sucursal</TableHead></TableRow></TableHeader>
          <TableBody><TableRow><TableCell>Centro</TableCell></TableRow></TableBody>
          <TableFooter><TableRow><TableCell>Total</TableCell></TableRow></TableFooter>
        </Table>
      </>,
    )

    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeInTheDocument()
    expect(screen.getByText('Periodo actual')).toHaveClass('text-muted-foreground')
    expect(screen.getByTestId('skeleton')).toHaveClass('animate-pulse')
    expect(screen.getByLabelText('Progreso base').querySelector('div')).toHaveStyle({
      transform: 'translateX(-60%)',
    })
    const keysarProgress = screen.getAllByRole('progressbar')[1]
    expect(keysarProgress).toBeDefined()
    expect(keysarProgress!.querySelector('div')).toHaveStyle({
      transform: 'translateX(-15%)',
    })
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical')
    expect(screen.getByRole('table')).toHaveTextContent('Centro')
    expect(screen.getByText('Ventas')).toBeInTheDocument()
  })
})
