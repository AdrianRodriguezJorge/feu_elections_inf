package logica;

public abstract class Usuario {
	protected String nombre;
	protected String correo;
	protected String contrasenna;
	
	public String getNombre() {
		return nombre;
	}
	public void setNombre(String nombre) {
		if (!(nombre.replaceAll(" ", "").equalsIgnoreCase(""))) 
		{
			this.nombre = nombre;
		}
		else throw new IllegalArgumentException("El nombre no es válido.");
	}
	public String getCorreo() {
		return correo;
	}
	public void setCorreo(String correo) {
		if (!(correo.replaceAll(" ", "").equalsIgnoreCase("")) && correo.contains("@")) 
		{
			this.correo = correo;
		}
		else throw new IllegalArgumentException("Error.");
	}
	public String getContrasenna() {
		return contrasenna;
	}
	public void setContrasenna(String contrasenna) {
		if (!(contrasenna.replaceAll(" ", "").equalsIgnoreCase(""))) 
		{
			this.contrasenna = contrasenna;
		}
		else throw new IllegalArgumentException("Error.");
	}
	public Usuario(String nombre, String correo, String contrasenna) {
		setNombre(nombre);
		setCorreo(correo);
		setContrasenna(contrasenna);
	}
	
	@Override
	public String toString ()
	{
		return nombre;
	}	
}
