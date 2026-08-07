import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";

export default function FactoryProfile({onProfileUpdated}) {

  const [factoryName, setFactoryName] = useState("");
  const [logo, setLogo] = useState(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fileInputRef = useRef(null);


  useEffect(() => {
    loadProfile();
  }, []);


  const loadProfile = async () => {

    const settings = await api.getSettings();

    if (settings) {

      setFactoryName(settings.factory_name || "");

      setLogo(settings.factory_logo || null);

    }

  };


  const handleLogoChange = (e) => {

    const file = e.target.files[0];

    if (!file) return;


    const reader = new FileReader();


    reader.onload = () => {

      setLogo(reader.result);

    };


    reader.readAsDataURL(file);

  };


  const saveProfile = async () => {


    if (newPassword && newPassword !== confirmPassword) {

      alert("New password and confirm password do not match");

      return;

    }


    if (newPassword) {

      const valid =
        await api.verifyMasterPassword(oldPassword);


      if (!valid) {

        alert("Current password is incorrect");

        return;

      }

    }


  await api.saveSettings(
  factoryName,
  logo,
  newPassword || null
);

if(onProfileUpdated){
  onProfileUpdated();
}


    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");

  };


  return (

    <div className="container-fluid">


      <h3 className="fw-bold mb-4">
        <i className="bi bi-building me-2"></i>
        Factory Profile
      </h3>



      <div className="card shadow-sm">


        <div className="card-body p-4">


          <h5 className="fw-bold mb-4">
            Factory Information
          </h5>



          <div className="mb-4">

            <label className="form-label fw-bold">
              Factory Name
            </label>


            <input

              className="form-control"

              value={factoryName}

              onChange={(e) => setFactoryName(e.target.value)}

            />

          </div>




          <div className="mb-4">

            <label className="form-label fw-bold">
              Factory Logo
            </label>


            <div

              className="border rounded d-flex justify-content-center align-items-center mb-3"

              style={{
                width: "130px",
                height: "130px",
                overflow: "hidden"
              }}

            >


              {

                logo ?

                  <img

                    src={logo}

                    alt="Factory Logo"

                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain"
                    }}

                  />

                  :

                  <span className="text-muted">
                    No Logo
                  </span>

              }


            </div>



            <input

              type="file"

              accept="image/*"

              ref={fileInputRef}

              className="d-none"

              onChange={handleLogoChange}

            />


            <button

              className="btn btn-outline-secondary"

              onClick={() => fileInputRef.current.click()}

            >

              Change Logo

            </button>


          </div>




          <hr />


          <h5 className="fw-bold mb-4">

            Change Password

          </h5>



          <div className="row g-3">


            <div className="col-md-4">

              <label className="form-label">
                Current Password
              </label>

              <input

                type="password"

                className="form-control"

                value={oldPassword}

                onChange={(e) => setOldPassword(e.target.value)}

              />

            </div>



            <div className="col-md-4">

              <label className="form-label">
                New Password
              </label>

              <input

                type="password"

                className="form-control"

                value={newPassword}

                onChange={(e) => setNewPassword(e.target.value)}

              />

            </div>




            <div className="col-md-4">

              <label className="form-label">
                Confirm Password
              </label>


              <input

                type="password"

                className="form-control"

                value={confirmPassword}

                onChange={(e) => setConfirmPassword(e.target.value)}

              />

            </div>


          </div>



          <div className="text-end mt-4">


            <button

              className="btn btn-primary px-4"

              onClick={saveProfile}

            >

              Save Changes

            </button>


          </div>



        </div>


      </div>


    </div>

  );

}