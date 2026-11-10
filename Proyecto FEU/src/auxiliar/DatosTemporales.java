package auxiliar;
import java.util.ArrayList;
import logica.*;

public class DatosTemporales 
{
     public ComisionElectoral CE;
     // public static String info;

     public DatosTemporales ()
     {
          CE = new ComisionElectoral();

          CE.getCandidatosActivos().add(new Candidato("Adrián", "Rodríguez Jorge", "02091978927", "Masculino", "Informática", 1, 11, "(biografía aqui)"));
          CE.getCandidatosActivos().add(new Candidato("Adriana", "Porrata Morffi","04120972927",  "Femenino", "Industrial", 2, 22, "(biografía aqui)"));
          CE.getCandidatosActivos().add(new Candidato("Pedro Pablo", "Chevalier Pérez", "02091973927", "Masculino", "Automática y Biomédica", 1,11, "(biografía aqui)"));
          CE.getCandidatosActivos().add(new Candidato("Carlos Manuel", "Sierra Hernández", "04120974927", "Masculino", "Civil", 2, 22, "(biografía aqui)"));
          CE.getCandidatosActivos().add(new Candidato("Diana", "Delgado Fernández", "02091975927", "Femenino", "Eléctrica", 1, 11, "(biografía aqui)"));
          CE.getCandidatosActivos().add(new Candidato("Rachel de la Caridad", "Valdés Sarracent", "04120976927", "Femenino", "Industrial", 2, 22, "(biografía aqui)"));
          CE.getCandidatosActivos().add(new Candidato("Leyder", "Ignacio Herrera Bello", "02091977927", "Masculino", "Automática y Biomédica", 1, 11, "(biografía aqui)"));
          CE.getCandidatosActivos().add(new Candidato("Lia Lorena", "Rondón Martínez", "04120978927", "Femenino", "Civil", 3, 32, "(biografía aqui)"));
          CE.getCandidatosActivos().add(new Candidato("Orlando Javier", "Marrero Gonzalez", "02091979927", "Masculino", "Eléctrica", 1, 12, "(biografía aqui)"));
          CE.getCandidatosActivos().add(new Candidato("Dennis Serafín", "Rodríguez Armenteros", "04120975927", "Masculino", "Arquitectura", 4, 41, "(biografía aqui)"));
          CE.getCandidatosActivos().add(new Candidato("Abdiel", "Rodríguez Lara", "03100976927", "Masculino", "Arquitectura", 4, 41, "(biografía aqui)"));
          
          CE.getUsuarios().add(new Votante( "Juan","juan@gmail.com", "1234" ));
          CE.getUsuarios().add(new Votante( "Sonia","sonia@gmail.com", "5678" ));
          CE.getUsuarios().add(new Votante( "Jenni","jenni@gmail.com", "1111" ));
          CE.getUsuarios().add(new Votante( "Fermin","fermin@gmail.com", "2222" ));
          CE.getUsuarios().add(new Votante( "Roberto","roberto@gmail.com", "3333" ));

          CE.getUsuarios().add(new Administrador( "Admin","admin@gmail.com", "0000" ));
     }

     public ComisionElectoral getCE() 
     {
          return CE;
     }
}
