package logica;

public class Linea_Boleta {
	private String nombre;
	private boolean miembro;
	private boolean presidente;
	
	public String getNombre(){
		return nombre;
	}
	public void setNombre(String nombre) {
		if (!(nombre.replaceAll(" ", "").equalsIgnoreCase(""))) 
		{
			this.nombre = nombre;
		}
		else throw new IllegalArgumentException("El nombre no es válido.");
	}
	
	public boolean esMiembro() {
		return miembro;
	}
	public void setMiembro(boolean miembro) {
		this.miembro = miembro;
	}
	public boolean esPresidente() {
		return presidente;
	}
	public void setPresidente(boolean presidente) {
		this.presidente = presidente;
	}
	
	public Linea_Boleta(String nombre,boolean miembro, boolean presidente) {
		setNombre(nombre);
		setMiembro(miembro);
		setPresidente(presidente);
	}
	
	
}
