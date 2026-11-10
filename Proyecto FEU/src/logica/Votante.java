package logica;

public class Votante extends Usuario{
	private boolean yaVoto;

	public boolean getYaVoto() {
		return yaVoto;
	}

	public void setYaVoto(boolean yaVoto) {
		this.yaVoto = yaVoto;
	}

	public Votante(String nombre, String correo, String contrasenna) 
	{
		super(nombre, correo, contrasenna);
		setYaVoto(false);
	}

	public Votante () {
		super("nombre","@","contraseña");
	}
	
}
