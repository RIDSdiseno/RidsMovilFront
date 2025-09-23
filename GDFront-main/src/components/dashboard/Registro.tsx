import React, { useState } from "react";
import {
  FaUser,
  FaEnvelope,
  FaKey,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

const Registro: React.FC = () => {
  const [form, setForm] = useState({
    nombreUsuario: "",
    email: "",
    password: "",
    confirmPassword: "",
    comuna: "",
    telefono: "",
    direccion: "",
    fechaNacimiento: "",
    rol: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (name: string, value: string) => {
    let error = "";

    switch (name) {
      case "nombreUsuario":
        if (!value) error = "El nombre de usuario es obligatorio";
        else if (value.length < 3) error = "Mínimo 3 caracteres";
        break;
      case "email":
        if (!value) error = "El correo es obligatorio";
        else if (!/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(value))
          error = "Correo inválido";
        break;
      case "password":
        if (!value) error = "La contraseña es obligatoria";
        else if (
          !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(value)
        )
          error =
            "Debe tener 8+ caracteres, mayúscula, minúscula, número y símbolo";
        break;
      case "confirmPassword":
        if (value !== form.password) error = "Las contraseñas no coinciden";
        break;
      case "telefono":
        if (!value) error = "El teléfono es obligatorio";
        else if (!/^\d{8,15}$/.test(value.replace(/\D/g, "")))
          error = "Teléfono inválido (8-15 dígitos)";
        break;
      case "comuna":
        if (!value) error = "La comuna es obligatoria";
        break;
      case "rol":
        if (!value) error = "Seleccione un rol";
        break;
      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    if (errors[name]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validations = Object.keys(form).map(key => 
      validateField(key, (form as any)[key])
    );

    if (validations.some(valid => !valid)) {
      setIsSubmitting(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess("✅ Usuario registrado correctamente!");
      setForm({
        nombreUsuario: "",
        email: "",
        password: "",
        confirmPassword: "",
        comuna: "",
        telefono: "",
        direccion: "",
        fechaNacimiento: "",
        rol: "",
      });
    } catch (error) {
      setErrors({ submit: "Error al registrar usuario" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formFields = [
    [
      { name: "nombreUsuario", type: "text", label: "Nombre de usuario", icon: <FaUser />, required: true },
      { name: "email", type: "email", label: "Correo electrónico", icon: <FaEnvelope />, required: true },
    ],
    [
      { 
        name: "password", 
        type: showPassword ? "text" : "password", 
        label: "Contraseña", 
        icon: <FaKey />, 
        required: true,
        extraIcon: (
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        )
      },
      { 
        name: "confirmPassword", 
        type: showConfirmPassword ? "text" : "password", 
        label: "Confirmar contraseña", 
        icon: <FaKey />, 
        required: true,
        extraIcon: (
          <button 
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        )
      },
    ],
    [
      { name: "comuna", type: "text", label: "Comuna", icon: <FaMapMarkerAlt />, required: true },
      { name: "telefono", type: "tel", label: "Número de teléfono", icon: <FaPhone />, required: true },
    ],
    [
      { name: "direccion", type: "text", label: "Dirección", icon: <FaMapMarkerAlt />, required: false },
    ],
    [
      { name: "fechaNacimiento", type: "date", label: "Fecha de nacimiento", icon: <FaCalendarAlt />, required: false },
    ]
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Efectos de fondo neón */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-480/10 via-black to-yellow-480/0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      
      <form
        onSubmit={handleSubmit}
        className="relative bg-black/80 backdrop-blur-xl rounded-2xl p-6 md:p-8 w-full max-w-2xl border border-yellow-380/20 shadow-2xl shadow-green-480/10"
      >
        {/* Efecto de borde neón */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400/10 to-green-400/10 blur-sm"></div>
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-yellow-380 to-green-380 opacity-10 blur-lg"></div>
        
        <div className="relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">
              Registro de Usuario
            </h2>
            <p className="text-gray-300 mt-2">Complete todos los campos requeridos</p>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-400/20 to-green-600/20 border border-green-400/50 rounded-lg backdrop-blur-sm">
              <p className="text-green-400 text-sm text-center font-medium flex items-center justify-center">
                <span className="mr-2">✨</span> {success}
              </p>
            </div>
          )}

          {errors.submit && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-400/20 to-red-600/20 border border-red-400/50 rounded-lg">
              <p className="text-red-400 text-sm text-center font-medium">
                {errors.submit}
              </p>
            </div>
          )}

          {/* Campos del formulario */}
          <div className="space-y-4 md:space-y-6">
            {formFields.map((row, rowIndex) => (
              <div 
                key={rowIndex} 
                className={`grid gap-4 ${
                  row.length === 2 ? 'md:grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {row.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <label htmlFor={field.name} className="block text-sm font-medium text-yellow-400">
                      {field.label} {field.required && <span className="text-green-400">*</span>}
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400">
                        {field.icon}
                      </div>
                      <input
                        id={field.name}
                        type={field.type}
                        name={field.name}
                        placeholder={field.label}
                        value={(form as any)[field.name]}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-10 pr-10 py-3 rounded-lg bg-black/50 border text-white placeholder-gray-400 focus:outline-none transition-all duration-300 ${
                          errors[field.name] 
                            ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20" 
                            : "border-yellow-400/30 focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                        }`}
                        required={field.required}
                      />
                      {"extraIcon" in field && field.extraIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {field.extraIcon}
                        </div>
                      )}
                    </div>
                    {errors[field.name] && (
                      <p className="text-red-400 text-xs flex items-center">
                        <span className="mr-1">⚠</span> {errors[field.name]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* Campo Rol */}
            <div className="space-y-2">
              <label htmlFor="rol" className="block text-sm font-medium text-yellow-400">
                Rol <span className="text-green-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="rol"
                  name="rol"
                  value={form.rol}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-3 pr-4 py-3 rounded-lg bg-black/50 border text-white focus:outline-none transition-all duration-300 ${
                    errors["rol"] 
                      ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20" 
                      : "border-yellow-400/30 focus:border-green-400 focus:ring-2 focus:ring-green-400/20"
                  }`}
                  required
                >
                  <option value="" className="bg-gray-900 text-white">Selecciona un rol</option>
                  <option value="ADMIN" className="bg-gray-900 text-white">Administrador</option>
                  <option value="USER" className="bg-gray-900 text-white">Usuario</option>
                  <option value="SUB_ADMIN" className="bg-gray-900 text-white">Sub Administrador</option>
                </select>
              </div>
              {errors["rol"] && (
                <p className="text-red-400 text-xs flex items-center">
                  <span className="mr-1">⚠</span> {errors["rol"]}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 mt-6 font-bold rounded-lg transition-all duration-300 transform hover:scale-105 ${
              isSubmitting
                ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                : 'bg-gradient-to-r from-yellow-400 to-green-400 text-black hover:shadow-lg hover:shadow-yellow-400/25'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                Registrando...
              </div>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2"></span> Registrar Usuario
              </span>
            )}
          </button>

          <div className="mt-4 text-center">
            <p className="text-yellow-400/80 text-xs">
              <span className="text-green-400">*</span> Campos obligatorios
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Registro;