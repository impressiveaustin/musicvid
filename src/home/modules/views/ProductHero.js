import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Button from "../components/Button";
import Typography from "../components/Typography";
import ProductHeroLayout from "./ProductHeroLayout";
import { Redirect } from "react-router-dom";

const backgroundImage = "./img/Background.png";

const styles = (theme) => ({
    background: {
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: "#7fc7d9", // Average color of the background image.
        backgroundPosition: "center"
    },
    button: {
        minWidth: 200
    },
    h5: {
        marginBottom: theme.spacing(4),
        marginTop: theme.spacing(4),
        [theme.breakpoints.up("sm")]: {
            marginTop: theme.spacing(10)
        }
    },
    more: {
        marginTop: theme.spacing(2)
    }
});

class ProductHero extends React.PureComponent {
    state = { redirectTo: "" };
    render() {
        const { classes } = this.props;

        if (this.state.redirectTo)
            return <Redirect to={this.state.redirectTo}></Redirect>;

        return (
            <ProductHeroLayout backgroundClassName={classes.background}>
                {/* Increase the network loading priority of the background image. */}
                <img style={{ display: "none" }} src={backgroundImage} alt="" />
                <Typography
                    color="inherit"
                    align="center"
                    variant="h2"
                    marked="center"
                >
                    Visualize your sound
                </Typography>
                <Typography
                    color="inherit"
                    align="center"
                    variant="h5"
                    className={classes.h5}
                >
                    Make professional visuals directly in your browser.
                    <br />
                    No payments, watermarks or forced sign-ups!
                </Typography>
                <Button
                    color="secondary"
                    variant="contained"
                    size="large"
                    className={classes.button}
                    style={{ textAlign: "center", color: "rgb(20,20,22)" }}
                    onClick={() => this.setState({ redirectTo: "/editor" })}
                >
                    {" "}
                    Open empty project{" "}
                </Button>

                <Typography
                    variant="body2"
                    color="inherit"
                    className={classes.more}
                >
                    Scroll down to view featured templates
                </Typography>
            </ProductHeroLayout>
        );
    }
}

ProductHero.propTypes = {
    classes: PropTypes.object.isRequired
};

export default withStyles(styles)(ProductHero);

/*

                <Button
                    color="primary"
                    variant="contained"
                    size="large"
                    className={classes.button}
                    style={{
                        textAlign: "center",
                        marginTop: 10,
                        width: 255,
                        backgroundColor: "#3333AA",
                        fontSize: "0.825rem"
                    }}
                    onClick={() => this.setState({redirectTo: "/downloads"})}
                >
                    Download desktop client
                </Button>*/
